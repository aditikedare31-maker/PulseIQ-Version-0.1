import "server-only";
import type {
  ExpressLikeRequest as Request,
  ExpressLikeResponse as Response,
  NextFunction,
} from "@/lib/compat/express";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuthContext } from "@/lib/auth/auth-context";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { randomInt, randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import {writeAuditLog} from "@/lib/audit/audit-log";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  COOKIE_MAX_AGE,
  REFRESH_TOKEN_TTL_MS,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_RESEND_WINDOW_MS,
  OTP_MAX_RESENDS,
  OTP_MAX_ATTEMPTS,
  OTP_LOCK_MS,
  EMAIL_FROM,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  NODE_ENV,
  DEMO_MODE,
} from "@/app/config/env.server";
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth/cookie-config";
import { logger } from "@/lib/logger";
import { normalizeRole } from "@/lib/auth/roles";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import {
  normalizePhoneForStorage,
  phoneLookupVariants,
  parseIndianMobileE164,
} from "@/lib/billing/billing-phone";
import { sendSmsOtp } from "@/services/sms/brevo-sms.service";
import { isSessionExpired } from "@/lib/auth/session-handler";
import { getCachedUserById, getCachedAuthContext, cacheWorkspaceOwner } from "@/lib/request-cache";
import { getAccountInfo } from "@/lib/account/account-state";

const isPlaceholderSmtpHost = SMTP_HOST === "smtp.example.com";

// Use globalThis to persist SMTP transporter across hot reloads in development
const globalForSmtp = globalThis as unknown as {
  transporter?: ReturnType<typeof nodemailer.createTransport> | null;
  smtpVerified?: boolean;
  smtpVerifying?: boolean;
  smtpVerifyPromise?: Promise<void>;
};

function getMailTransporter() {
  if (globalForSmtp.transporter) {
    return globalForSmtp.transporter;
  }

  if (!SMTP_HOST || isPlaceholderSmtpHost) {
    return null;
  }

  globalForSmtp.transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  return globalForSmtp.transporter;
}

/*
 NOTE: SMTP verification is intentionally not invoked during signup/signin.
 The current flow sends mail directly via `sendVerificationEmail`. Keep this
 helper around for manual health checks or future diagnostics.
async function verifySmtpOnce() {
  if (globalForSmtp.smtpVerified) {
    return;
  }
  if (globalForSmtp.smtpVerifyPromise) {
    return globalForSmtp.smtpVerifyPromise;
  }

  const transporter = getMailTransporter();
  if (!transporter) {
    return;
  }

  globalForSmtp.smtpVerifyPromise = transporter
    .verify()
    .then(() => {
      globalForSmtp.smtpVerified = true;
      logger.info("email", "smtp_verified");
    })
    .catch((error: unknown) => {
      globalForSmtp.smtpVerifyPromise = undefined;
      logger.error("email", "smtp_verification_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });

  return globalForSmtp.smtpVerifyPromise;
}
*/

function createToken(userId: string, emailVerified: boolean = false, phoneVerified: boolean = false) {
  const token = jwt.sign(
    { userId, emailVerified, phoneVerified },
    JWT_SECRET as string,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
  logger.info("auth", "jwt_created", {
    userId,
    emailVerified,
    phoneVerified,
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
  return token;
}

const COOKIE_PATH = "/";
const isProduction = process.env.NODE_ENV === "production";

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: COOKIE_PATH,
  maxAge: COOKIE_MAX_AGE,
};

function sendTokenCookie(res: Response, token: string) {
  logger.info("auth", "cookie_set", {
    name: AUTH_COOKIE_NAME,
    options: authCookieOptions,
    hasToken: !!token,
    tokenLength: token.length,
  });
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
}

function setRefreshCookie(res: Response, value: string) {
  const refreshCookieMaxAge = Math.floor(REFRESH_TOKEN_TTL_MS / 1000);
  logger.info("auth", "refresh_cookie_set", {
    name: REFRESH_COOKIE_NAME,
    path: "/api/auth",
    maxAge: refreshCookieMaxAge,
    valuePrefix: value.split(".")[0],
  });
  res.cookie(REFRESH_COOKIE_NAME, value, {
    ...authCookieOptions,
    maxAge: refreshCookieMaxAge,
    path: "/api/auth",
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, { ...authCookieOptions, maxAge: 0 });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...authCookieOptions,
    path: "/api/auth",
    maxAge: 0,
  });
}

function generateOtp() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return normalizePhoneForStorage(value);
}

function isPhone(value: string) {
  const normalized = normalizePhone(value);
  if (/^\+91\d{10}$/.test(normalized)) return true;
  return /^\d{7,15}$/.test(normalized);
}

function parseContact(contact?: string) {
  if (!contact) {
    return {};
  }

  const trimmed = contact.trim();
  if (isEmail(trimmed)) {
    return { email: normalizeEmail(trimmed) };
  }

  if (isPhone(trimmed)) {
    return { phone: normalizePhone(trimmed) };
  }

  return {};
}

type VerificationType = "EMAIL_OTP" | "PHONE_OTP";
const VERIFICATION_CODE_TYPE_EMAIL: VerificationType = "EMAIL_OTP";
const VERIFICATION_CODE_TYPE_PHONE: VerificationType = "PHONE_OTP";

function generateOtpDifferentFrom(existingOtp: string) {
  let otp = generateOtp();
  while (otp === existingOtp) {
    otp = generateOtp();
  }
  return otp;
}

function normalizePhoneNumber(value: string) {
  return normalizePhone(value);
}

async function createVerificationCode(
  db: any,
  params: {
    userId: string;
    type: VerificationType;
    target: string;
    otp: string;
    now: Date;
    resendCount?: number;
  }
) {
  return db.verificationCode.create({
    data: {
      userId: params.userId,
      type: params.type,
      target: params.target,
      codeHash: await hashOtp(params.otp),
      expiresAt: new Date(params.now.getTime() + OTP_TTL_MS),
      attempts: 0,
      resendCount: params.resendCount ?? 1,
    },
  });
}

async function createOtpForChannel(
  db: any,
  params: {
    userId: string;
    type: VerificationType;
    target: string;
    existingOtp?: string;
    now: Date;
    resendCount?: number;
  }
) {
  const otp = params.existingOtp
    ? generateOtpDifferentFrom(params.existingOtp)
    : generateOtp();

  await invalidateVerificationCodes(db, params.userId, params.type);
  await createVerificationCode(db, {
    userId: params.userId,
    type: params.type,
    target: params.target,
    otp,
    now: params.now,
    resendCount: params.resendCount,
  });

  return otp;
}

async function sendMissingVerificationOtps(user: {
  id: string;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}) {
  const now = new Date();
  const result: {
    emailOtpSent: boolean | null;
    phoneOtpSent: boolean | null;
    emailError?: string;
    phoneError?: string;
  } = {
    emailOtpSent: null,
    phoneOtpSent: null,
  };

  let emailOtp: string | undefined;
  let phoneOtp: string | undefined;

  if (!user.emailVerified && user.email) {
    emailOtp = generateOtp();
  }

  if (!user.phoneVerified && user.phone) {
    phoneOtp = emailOtp ? generateOtpDifferentFrom(emailOtp) : generateOtp();
  }

  if (!user.emailVerified && user.email) {
    try {
      await invalidateVerificationCodes(prisma, user.id, VERIFICATION_CODE_TYPE_EMAIL);
      await createVerificationCode(prisma, {
        userId: user.id,
        type: VERIFICATION_CODE_TYPE_EMAIL,
        target: user.email,
        otp: emailOtp!,
        now,
      });
      result.emailOtpSent = await sendVerificationEmail(user.email, emailOtp!);
      if (!result.emailOtpSent) {
        result.emailError = "Could not send email OTP. Please retry.";
      }
    } catch (error) {
      result.emailOtpSent = false;
      result.emailError = "Could not send email OTP. Please retry.";
      logger.error("auth", "send_missing_email_otp_failed", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!user.phoneVerified && user.phone) {
    try {
      await invalidateVerificationCodes(prisma, user.id, VERIFICATION_CODE_TYPE_PHONE);
      await createVerificationCode(prisma, {
        userId: user.id,
        type: VERIFICATION_CODE_TYPE_PHONE,
        target: user.phone,
        otp: phoneOtp!,
        now,
      });
      result.phoneOtpSent = await sendSmsOtp({ phone: user.phone, otp: phoneOtp! });
      if (!result.phoneOtpSent) {
        result.phoneError = "Could not send SMS OTP. Please retry.";
      }
    } catch (error) {
      result.phoneOtpSent = false;
      result.phoneError = "Could not send SMS OTP. Please retry.";
      logger.error("auth", "send_missing_phone_otp_failed", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (user.emailVerified) {
    result.emailOtpSent = null;
  }
  if (user.phoneVerified) {
    result.phoneOtpSent = null;
  }

  return result;
}

async function findLatestActiveVerificationCode(
  userId: string,
  type: VerificationType,
  target: string,
) {
  return prisma.verificationCode.findFirst({
    where: {
      userId,
      type,
      target,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function invalidateVerificationCodes(
  db: any,
  userId: string,
  type: VerificationType
) {
  const now = new Date();
  await db.verificationCode.updateMany({
    where: {
      userId,
      type,
      consumedAt: null,
    },
    data: {
      consumedAt: now,
    },
  });
}

async function getVerificationStatusByContact(contactValue?: string) {
  const parsedContact = parseContact(contactValue);
  if (!parsedContact.email && !parsedContact.phone) {
    return null;
  }

  const where = parsedContact.email
    ? { email: parsedContact.email }
    : { phone: parsedContact.phone };

  return prisma.user.findFirst({
    where,
    select: {
      id: true,
      email: true,
      phone: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });
}

const authUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  password: true,
  workspaceId: true,
  role: true,
  isVerified: true,
  emailVerified: true,
  phoneVerified: true,
  workspace: {
    select: {
      id: true,
      name: true,
    },
  },
};

async function hashOtp(otp: string) {
  return bcrypt.hash(otp, 12);
}

async function hashToken(token: string) {
  // Refresh tokens are high-entropy random strings. Use a fast
  // cryptographic hash (SHA-256) instead of bcrypt for storage.
  // bcrypt is reserved for human passwords / OTPs.
  return createHash("sha256").update(token).digest("hex");
}

async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const subject = "Your verification code";
  const text = `Your verification code is ${code}. It expires in 5 minutes.`;
  const html = `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes.</p>`;

  const transporter = getMailTransporter();
  if (!transporter) {
    if (NODE_ENV === "development") {
      logger.info("email", "verification_dev_mode", { email });
    }
    return true;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    logger.error("email", "send_failed", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function sendSms(phone: string, _code: string): Promise<boolean> {
  if (NODE_ENV === "development") {
    logger.info("sms", "verification_dev_mode", { phoneSuffix: phone.slice(-4) });
  }
  return true;
}

async function sendOtp(contact: { email?: string; phone?: string }, otp: string) {
  if (contact.email) {
    return sendVerificationEmail(contact.email, otp);
  }

  if (contact.phone) {
    return sendSms(contact.phone, otp);
  }

  return false;
}

async function findUserByContact(contactValue?: string) {
  const parsedContact = parseContact(contactValue);
  if (parsedContact.email) {
    return prisma.user.findUnique({
      where: { email: parsedContact.email },
      select: authUserSelect,
    });
  }

  if (!parsedContact.phone) {
    return null;
  }

  const variants = phoneLookupVariants(parsedContact.phone);
  if (variants.length === 0) {
    return null;
  }

  return prisma.user.findFirst({
    where: { phone: { in: variants } },
    select: authUserSelect,
  });
}

async function issueRefreshToken(userId: string, res: Response) {
  const token = randomBytes(48).toString("hex");
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: tokenHash, refreshTokenExpiresAt: expiresAt },
  });

  const cookieValue = `${userId}.${token}`;
  logger.info("auth", "refresh_cookie_set_start", { userId, refreshCookieName: REFRESH_COOKIE_NAME });
  const refreshCookieStart = Date.now();
  setRefreshCookie(res, cookieValue);
  logger.info("auth", "refresh_cookie_set_end", {
    userId,
    durationMs: Date.now() - refreshCookieStart,
    refreshCookieName: REFRESH_COOKIE_NAME,
  });
}

async function clearRefreshTokenForUserId(userId: string | undefined) {
  if (!userId) return;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });
  } catch {
    // ignore
  }
}

export async function signUp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const firstName = body.firstName as string | undefined;
    const lastName = body.lastName as string | undefined;
    const company = body.company as string | undefined;
    const rawEmail = body.email as string | undefined;
    const rawPhone = body.phone as string | undefined;
    const password = body.password as string | undefined;

    if (!firstName || !lastName || !company || !rawEmail || !rawPhone || !password) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const email = normalizeEmail(String(rawEmail));
    if (!isEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const phone = parseIndianMobileE164(String(rawPhone));
    if (!phone) {
      return res.status(400).json({
        message:
          "Enter a valid 10-digit Indian mobile number (starts with 6–9). Landlines are not supported.",
        code: "INVALID_PHONE",
      });
    }

    const workspaceName = String(company).trim().toUpperCase();
    const signupStart = Date.now();
    const now = new Date();

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    const existingByPhone = await prisma.user.findFirst({
      where: { OR: phoneLookupVariants(phone).map((variant) => ({ phone: variant })) },
    });

    const existingUser = existingByEmail ?? existingByPhone;
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(409).json({
          message: "Account already exists. Please sign in.",
        });
      }

      if (existingByEmail && existingByPhone && existingByEmail.id !== existingByPhone.id) {
        return res.status(409).json({
          message: "An account already exists with this email or phone number.",
        });
      }

      logger.info("auth", "signup_existing_unverified_user", {
        userId: existingUser.id,
        emailVerified: existingUser.emailVerified,
        phoneVerified: existingUser.phoneVerified,
      });

      const passwordHashStart = Date.now();
      const hashedPassword = await bcrypt.hash(String(password), 12);
      logger.info("auth", "signup_password_hash_end", {
        durationMs: Date.now() - passwordHashStart,
      });

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          firstName,
          lastName,
          password: hashedPassword,
        },
      });

      const sendResult = await sendMissingVerificationOtps({
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        emailVerified: updatedUser.emailVerified,
        phoneVerified: updatedUser.phoneVerified,
      });

      writeAuditLog(
        {
          action: "auth.signup",
          outcome: "success",
          userId: updatedUser.id,
          workspaceId: updatedUser.workspaceId,
          resource: "signup",
        },
        req,
      );

      return res.status(200).json({
        message: "Please verify your account to continue.",
        verificationRequired: true,
        redirectTo: "/verify-account",
        emailVerified: updatedUser.emailVerified,
        phoneVerified: updatedUser.phoneVerified,
        emailOtpSent: sendResult.emailOtpSent,
        phoneOtpSent: sendResult.phoneOtpSent,
        emailError: sendResult.emailError,
        phoneError: sendResult.phoneError,
        contact: updatedUser.email ?? updatedUser.phone,
      });
    }

    const emailOtp = generateOtp();
    const phoneOtp = generateOtpDifferentFrom(emailOtp);
    logger.info("auth", "signup_password_hash_start", {});
    const passwordHashStart = Date.now();
    const hashedPassword = await bcrypt.hash(String(password), 12);
    logger.info("auth", "signup_password_hash_end", {
      durationMs: Date.now() - passwordHashStart,
    });

    // For Phase 1, signup always creates a production trial workspace.
    const workspaceType = "PRODUCTION" as const;
    const subscriptionStatus = "TRIALING" as const;
    const billingStatus = "trialing" as const;
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    logger.info("auth", "signup_db_tx_start", {});
    const dbTxStart = Date.now();
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          password: hashedPassword,
          isVerified: false,
          emailVerified: false,
          phoneVerified: false,
          role: "owner",
          workspace: {
            create: {
              name: workspaceName,
              workspaceType,
              billingStatus,
              subscriptionStatus,
              onboardingCompleted: false,
              trialEndsAt,
              billingPhoneNumber: phone,
            },
          },
        },
        include: {
          workspace: true,
        },
      });

      await createVerificationCode(tx, {
        userId: createdUser.id,
        type: VERIFICATION_CODE_TYPE_EMAIL,
        target: email,
        otp: emailOtp,
        now,
      });

      await createVerificationCode(tx, {
        userId: createdUser.id,
        type: VERIFICATION_CODE_TYPE_PHONE,
        target: phone,
        otp: phoneOtp,
        now,
      });

      return createdUser;
    });

    logger.info("auth", "signup_db_tx_end", { durationMs: Date.now() - dbTxStart });
    logger.info("auth", "signup_total", { durationMs: Date.now() - signupStart });

    const emailSent = await sendVerificationEmail(email, emailOtp);
    const smsSent = await sendSmsOtp({ phone, otp: phoneOtp });
    const responseStatus = emailSent && smsSent ? 201 : 200;
    const responseMessage = emailSent && smsSent
      ? "Account created successfully. Verification codes were sent."
      : "Account created. Verification codes could not be delivered on all channels. Please retry the missing delivery.";

    writeAuditLog(
      {
        action: "auth.signup",
        userId: user.id,
        workspaceId: user.workspaceId,
        resource: "signup",
      },
      req,
    );

    logger.info("auth", "signup_success", { userId: user.id, email: user.email });

    return res.status(responseStatus).json({
      message: responseMessage,
      verificationRequired: true,
      redirectTo: "/verify-account",
      emailVerified: false,
      phoneVerified: false,
      emailOtpSent: emailSent,
      phoneOtpSent: smsSent,
      contact: email,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        workspace: {
          id: user.workspace?.id,
          name: user.workspace?.name,
          billingPhoneNumber: user.workspace?.billingPhoneNumber,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to send verification code") {
      return res.status(500).json({
        message: "Unable to send verification code. Check mail/SMS settings and try again.",
      });
    }
    return next(error);
  }
}

export async function signIn(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const contact = body.contact as string | undefined;
    const password = body.password as string | undefined;
    const requestStart = Date.now();

    logger.info("auth", "signin_request_start", { contact });

    if (!contact || !password) {
      return res.status(400).json({ message: "Email or phone and password are required." });
    }

    const lookupStart = Date.now();
    const user = await findUserByContact(contact);
    const lookupDurationMs = Date.now() - lookupStart;
    logger.info("auth", "signin_user_lookup_end", {
      contact,
      userId: user?.id ?? null,
      durationMs: lookupDurationMs,
    });

    if (!user) {
      logger.info("auth", "signin_failed", { reason: "user_not_found", contact });
      writeAuditLog({ action: "auth.signin_failed", outcome: "failure", resource: "signin" }, req);
      logger.info("auth", "signin_response_ready", { status: 401, durationMs: Date.now() - requestStart });
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const passwordVerifyStart = Date.now();
    logger.info("auth", "password_verify_start", { userId: user.id });
    const passwordMatches = await bcrypt.compare(String(password), String(user.password));
    const passwordVerifyDurationMs = Date.now() - passwordVerifyStart;
    logger.info("auth", "password_verify_end", {
      userId: user.id,
      durationMs: passwordVerifyDurationMs,
    });

    if (!passwordMatches) {
      logger.info("auth", "signin_failed", { reason: "invalid_password", userId: user.id });
      writeAuditLog(
        {
          action: "auth.signin_failed",
          outcome: "failure",
          userId: user.id,
          workspaceId: user.workspaceId,
          resource: "signin",
        },
        req,
      );
      logger.info("auth", "signin_response_ready", { status: 401, durationMs: Date.now() - requestStart });
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Phase 1: Allow signin with at least one verification method (email OR phone)
    const hasMinimumVerification = user.emailVerified || user.phoneVerified;
    if (!hasMinimumVerification) {
      const sendResult = await sendMissingVerificationOtps({
        id: user.id,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      });

      logger.info("auth", "signin_unverified_flow", {
        userId: user.id,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        emailOtpSent: sendResult.emailOtpSent,
        phoneOtpSent: sendResult.phoneOtpSent,
      });

      return res.status(200).json({
        message: "Please complete verification to access your account.",
        verificationRequired: true,
        redirectTo: "/verify-account",
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        emailOtpSent: sendResult.emailOtpSent,
        phoneOtpSent: sendResult.phoneOtpSent,
        emailError: sendResult.emailError,
        phoneError: sendResult.phoneError,
        contact: user.email ?? user.phone,
      });
    }

    logger.info("auth", "jwt_create_start", { userId: user.id });
    const jwtCreateStart = Date.now();
    const token = createToken(user.id, user.emailVerified, user.phoneVerified);
    sendTokenCookie(res, token);
    logger.info("auth", "jwt_create_end", {
      userId: user.id,
      durationMs: Date.now() - jwtCreateStart,
    });

    logger.info("auth", "refresh_token_create_start", { userId: user.id });
    const refreshTokenStart = Date.now();
    await issueRefreshToken(user.id, res);
    logger.info("auth", "refresh_token_create_end", {
      userId: user.id,
      durationMs: Date.now() - refreshTokenStart,
    });

    logger.info("auth", "audit_log_start", { userId: user.id, contact });
    const auditLogStart = Date.now();
    writeAuditLog(
      {
        action: "auth.signin",
        userId: user.id,
        workspaceId: user.workspaceId,
        resource: "signin",
      },
      req,
    );
    logger.info("auth", "audit_log_end", {
      userId: user.id,
      durationMs: Date.now() - auditLogStart,
    });

    logger.info("auth", "signin_success", { userId: user.id, email: user.email });
    logger.info("auth", "session_created", {
      userId: user.id,
      tokenTTL: JWT_EXPIRES_IN,
      cookieName: AUTH_COOKIE_NAME,
      cookieMaxAge: COOKIE_MAX_AGE,
      refreshCookieName: REFRESH_COOKIE_NAME,
      refreshCookieMaxAge: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
    });
    logger.info("auth", "signin_response_ready", { status: 200, durationMs: Date.now() - requestStart });

    const workspaceOwner = await prisma.user.findFirst({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const isWorkspaceOwner = workspaceOwner?.id === user.id;
    const normalizedRole = normalizeRole(user.role, isWorkspaceOwner);
    const permissions = getPermissionsForRole(normalizedRole);

    return res.status(200).json({
      message: "Signed in successfully.",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        activeWorkspaceId: user.workspaceId,
        activeWorkspaceName: (user as unknown as { workspace?: { name?: string } }).workspace?.name,
        role: normalizedRole,
        permissions,
      },
    });
  } catch (error) {
    return next(error);
  }
}

function maskEmail(email?: string | null): string {
  if (!email) {
    return "";
  }

  const [local, domain] = email.split("@");
  if (!domain) {
    return email;
  }

  const visible = Math.min(2, local.length);
  const maskedLocal = `${local.slice(0, visible)}${"*".repeat(Math.max(local.length - visible, 1))}`;
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone?: string | null): string {
  if (!phone) {
    return "";
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) {
    return "*".repeat(digits.length);
  }

  const prefix = phone.slice(0, phone.length - digits.length);
  const visible = digits.slice(-4);
  const masked = "*".repeat(Math.max(digits.length - 4, 4));
  return `${prefix}${masked}${visible}`;
}

async function updateUserVerificationStatus(userId: string, type: VerificationType) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, phoneVerified: true },
    });

    if (!user) {
      return null;
    }

    const emailVerified = type === VERIFICATION_CODE_TYPE_EMAIL ? true : user.emailVerified;
    const phoneVerified = type === VERIFICATION_CODE_TYPE_PHONE ? true : user.phoneVerified;
    // Phase 1: User can access dashboard with at least one verification method
    const isVerified = emailVerified || phoneVerified;
    const fullyVerified = emailVerified && phoneVerified;

    return tx.user.update({
      where: { id: userId },
      data: {
        emailVerified,
        phoneVerified,
        isVerified,
      },
      select: {
        emailVerified: true,
        phoneVerified: true,
        isVerified: true,
      },
    });
  });
}

async function validateVerificationCode(
  userId: string,
  type: VerificationType,
  target: string,
  code: string,
) {
  const now = new Date();
  const codeRecord = await findLatestActiveVerificationCode(userId, type, target);

  if (!codeRecord) {
    return { status: "missing" as const };
  }

  if (codeRecord.expiresAt < now) {
    return { status: "expired" as const, codeId: codeRecord.id };
  }

  if (codeRecord.attempts >= OTP_MAX_ATTEMPTS) {
    return { status: "locked" as const, codeId: codeRecord.id };
  }

  const isValid = await bcrypt.compare(code, codeRecord.codeHash);
  if (!isValid) {
    const attempts = codeRecord.attempts + 1;
    await prisma.verificationCode.update({
      where: { id: codeRecord.id },
      data: {
        attempts,
        consumedAt: attempts >= OTP_MAX_ATTEMPTS ? now : null,
      },
    });

    return { status: attempts >= OTP_MAX_ATTEMPTS ? "locked" as const : "invalid" as const };
  }

  await prisma.verificationCode.update({
    where: { id: codeRecord.id },
    data: { consumedAt: now },
  });

  return { status: "ok" as const };
}

async function resolveUserForVerification(contact: string) {
  return findUserByContact(contact);
}

export async function verifyEmailOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const email = body.email as string | undefined;
    const code = body.code as string | number | undefined;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and OTP code are required." });
    }

    if (!/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ message: "OTP code must be a 6-digit number." });
    }

    const user = await resolveUserForVerification(email);
    if (!user || !user.email) {
      writeAuditLog(
        { action: "auth.verify_otp_failed", outcome: "failure", resource: "verify-email" },
        req,
      );
      return res.status(400).json({ message: "Unable to verify the provided email and code." });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        message: "Email is already verified.",
        emailVerified: true,
        phoneVerified: user.phoneVerified,
        isVerified: user.isVerified,
      });
    }

    const validation = await validateVerificationCode(user.id, VERIFICATION_CODE_TYPE_EMAIL, user.email, String(code));
    if (validation.status !== "ok") {
      const statusCode = validation.status === "locked" ? 429 : 400;
      const message =
        validation.status === "expired"
          ? "OTP has expired. Please request a new code."
          : validation.status === "locked"
          ? "Too many invalid attempts. Please request a new code."
          : "Invalid OTP code.";

      writeAuditLog(
        {
          action: "auth.verify_otp_failed",
          outcome: "failure",
          userId: user.id,
          workspaceId: user.workspaceId,
          resource: "verify-email",
        },
        req,
      );
      return res.status(statusCode).json({ message });
    }

    const updatedUser = await updateUserVerificationStatus(user.id, VERIFICATION_CODE_TYPE_EMAIL);
    const isVerified = updatedUser?.isVerified ?? false;
    const fullyVerified = (updatedUser?.emailVerified ?? false) && (updatedUser?.phoneVerified ?? false);

    // Phase 1: Issue tokens when minimum verification is met (at least one method verified)
    if (isVerified) {
      const token = createToken(user.id, true, updatedUser?.phoneVerified ?? false);
      sendTokenCookie(res, token);
      await issueRefreshToken(user.id, res);
    }

    writeAuditLog(
      {
        action: "auth.verify_otp",
        userId: user.id,
        workspaceId: user.workspaceId,
        resource: "verify-email",
      },
      req,
    );

    return res.status(200).json({
      message: fullyVerified
        ? "Email verified. Your account is now fully verified."
        : "Email verified. You can verify your phone later from Settings.",
      emailVerified: true,
      phoneVerified: updatedUser?.phoneVerified ?? false,
      isVerified,
      fullyVerified,
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyPhoneOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const phone = body.phone as string | undefined;
    const code = body.code as string | number | undefined;

    if (!phone || !code) {
      return res.status(400).json({ message: "Phone and OTP code are required." });
    }

    if (!/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ message: "OTP code must be a 6-digit number." });
    }

    const user = await resolveUserForVerification(phone);
    if (!user || !user.phone) {
      writeAuditLog(
        { action: "auth.verify_otp_failed", outcome: "failure", resource: "verify-phone" },
        req,
      );
      return res.status(400).json({ message: "Unable to verify the provided phone and code." });
    }

    if (user.phoneVerified) {
      return res.status(200).json({
        message: "Phone is already verified.",
        emailVerified: user.emailVerified,
        phoneVerified: true,
        isVerified: user.isVerified,
      });
    }

    const validation = await validateVerificationCode(user.id, VERIFICATION_CODE_TYPE_PHONE, user.phone, String(code));
    if (validation.status !== "ok") {
      const statusCode = validation.status === "locked" ? 429 : 400;
      const message =
        validation.status === "expired"
          ? "OTP has expired. Please request a new code."
          : validation.status === "locked"
          ? "Too many invalid attempts. Please request a new code."
          : "Invalid OTP code.";

      writeAuditLog(
        {
          action: "auth.verify_otp_failed",
          outcome: "failure",
          userId: user.id,
          workspaceId: user.workspaceId,
          resource: "verify-phone",
        },
        req,
      );
      return res.status(statusCode).json({ message });
    }

    const updatedUser = await updateUserVerificationStatus(user.id, VERIFICATION_CODE_TYPE_PHONE);
    const isVerified = updatedUser?.isVerified ?? false;
    const fullyVerified = (updatedUser?.emailVerified ?? false) && (updatedUser?.phoneVerified ?? false);

    // Phase 1: Issue tokens when minimum verification is met (at least one method verified)
    if (isVerified) {
      const token = createToken(user.id, updatedUser?.emailVerified ?? false, true);
      sendTokenCookie(res, token);
      await issueRefreshToken(user.id, res);
    }

    writeAuditLog(
      {
        action: "auth.verify_otp",
        userId: user.id,
        workspaceId: user.workspaceId,
        resource: "verify-phone",
      },
      req,
    );

    return res.status(200).json({
      message: fullyVerified
        ? "Phone verified. Your account is now fully verified."
        : "Phone verified. You can verify your email later from Settings.",
      emailVerified: updatedUser?.emailVerified ?? false,
      phoneVerified: true,
      isVerified,
      fullyVerified,
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  const body = req.body as Record<string, unknown>;
  const contact = body.contact as string | undefined;
  const code = body.code as string | number | undefined;

  if (!contact) {
    return res.status(400).json({ message: "Contact is required." });
  }

  const parsed = parseContact(contact);
  if (parsed.email) {
    req.body = { email: parsed.email, code };
    return verifyEmailOtp(req, res, next);
  }

  if (parsed.phone) {
    req.body = { phone: parsed.phone, code };
    return verifyPhoneOtp(req, res, next);
  }

  return res.status(400).json({ message: "Enter a valid email address or phone number." });
}

export async function resendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const contact = body.contact as string | undefined;

    if (!contact) {
      return res.status(400).json({ message: "Contact is required." });
    }

    const parsed = parseContact(contact);
    if (!parsed.email && !parsed.phone) {
      return res.status(400).json({ message: "Enter a valid email address or phone number." });
    }

    const type = parsed.email ? VERIFICATION_CODE_TYPE_EMAIL : VERIFICATION_CODE_TYPE_PHONE;
    const target = parsed.email ?? parsed.phone!;
    const user = await findUserByContact(contact);

    if (!user) {
      return res
        .status(200)
        .json({ message: "If this account exists, a fresh OTP has been sent." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified." });
    }

    if (type === VERIFICATION_CODE_TYPE_EMAIL && user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    if (type === VERIFICATION_CODE_TYPE_PHONE && user.phoneVerified) {
      return res.status(400).json({ message: "Phone is already verified." });
    }

    const now = new Date();
    const latestCode = await findLatestActiveVerificationCode(user.id, type, target);

    if (latestCode && now.getTime() - latestCode.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: "Please wait before requesting another code." });
    }

    let resendCount = 1;
    if (latestCode && now.getTime() - latestCode.createdAt.getTime() <= OTP_RESEND_WINDOW_MS) {
      resendCount = latestCode.resendCount + 1;
    }

    if (resendCount > OTP_MAX_RESENDS) {
      return res.status(429).json({ message: "Resend limit reached. Please try again later." });
    }

    await invalidateVerificationCodes(prisma, user.id, type);

    const otp = generateOtp();
    await createVerificationCode(prisma, {
      userId: user.id,
      type,
      target,
      otp,
      now,
    });

    let sent = false;
    if (type === VERIFICATION_CODE_TYPE_EMAIL && user.email) {
      sent = await sendVerificationEmail(user.email, otp);
    }

    if (type === VERIFICATION_CODE_TYPE_PHONE && user.phone) {
      sent = await sendSmsOtp({ phone: user.phone, otp });
    }

    if (!sent) {
      throw new Error("Failed to send verification code");
    }

    writeAuditLog(
      {
        action: "auth.resend_otp",
        userId: user.id,
        workspaceId: user.workspaceId,
        resource: type === VERIFICATION_CODE_TYPE_EMAIL ? "resend-email-otp" : "resend-phone-otp",
      },
      req,
    );

    return res.status(200).json({
      message: "Verification code resent successfully.",
      cooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to send verification code") {
      return res.status(500).json({
        message: "Unable to send verification code. Check mail/SMS settings and try again.",
      });
    }
    return next(error);
  }
}

export async function sendEmailOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const email = body.email as string | undefined;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await findUserByContact(email);
    if (!user || !user.email) {
      return res
        .status(200)
        .json({ message: "If this account exists, a fresh email OTP has been sent." });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    const now = new Date();
    const target = user.email;
    const latestCode = await findLatestActiveVerificationCode(user.id, VERIFICATION_CODE_TYPE_EMAIL, target);

    if (latestCode && now.getTime() - latestCode.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: "Please wait before requesting another code." });
    }

    let resendCount = 1;
    if (latestCode && now.getTime() - latestCode.createdAt.getTime() <= OTP_RESEND_WINDOW_MS) {
      resendCount = latestCode.resendCount + 1;
    }

    if (resendCount > OTP_MAX_RESENDS) {
      return res.status(429).json({ message: "Resend limit reached. Please try again later." });
    }

    await invalidateVerificationCodes(prisma, user.id, VERIFICATION_CODE_TYPE_EMAIL);

    const otp = generateOtp();
    await createVerificationCode(prisma, {
      userId: user.id,
      type: VERIFICATION_CODE_TYPE_EMAIL,
      target,
      otp,
      now,
    });

    const sent = await sendVerificationEmail(target, otp);
    if (!sent) {
      throw new Error("Failed to send verification code");
    }

    writeAuditLog(
      {
        action: "auth.resend_otp",
        userId: user.id,
        workspaceId: user.workspaceId,
        resource: "send-email-otp",
      },
      req,
    );

    return res.status(200).json({
      message: "A fresh email OTP has been sent.",
      cooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to send verification code") {
      return res.status(500).json({
        message: "Unable to send verification code. Check mail/SMS settings and try again.",
      });
    }
    return next(error);
  }
}

export async function sendPhoneOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const phone = body.phone as string | undefined;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required." });
    }

    const user = await findUserByContact(phone);
    if (!user || !user.phone) {
      return res
        .status(200)
        .json({ message: "If this account exists, a fresh phone OTP has been sent." });
    }

    if (user.phoneVerified) {
      return res.status(400).json({ message: "Phone is already verified." });
    }

    const now = new Date();
    const target = user.phone;
    const latestCode = await findLatestActiveVerificationCode(user.id, VERIFICATION_CODE_TYPE_PHONE, target);

    if (latestCode && now.getTime() - latestCode.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: "Please wait before requesting another code." });
    }

    let resendCount = 1;
    if (latestCode && now.getTime() - latestCode.createdAt.getTime() <= OTP_RESEND_WINDOW_MS) {
      resendCount = latestCode.resendCount + 1;
    }

    if (resendCount > OTP_MAX_RESENDS) {
      return res.status(429).json({ message: "Resend limit reached. Please try again later." });
    }

    await invalidateVerificationCodes(prisma, user.id, VERIFICATION_CODE_TYPE_PHONE);

    const otp = generateOtp();
    await createVerificationCode(prisma, {
      userId: user.id,
      type: VERIFICATION_CODE_TYPE_PHONE,
      target,
      otp,
      now,
    });

    const sent = await sendSmsOtp({ phone: target, otp });
    if (!sent) {
      throw new Error("Failed to send verification code");
    }

    writeAuditLog(
      {
        action: "auth.resend_otp",
        userId: user.id,
        workspaceId: user.workspaceId,
        resource: "send-phone-otp",
      },
      req,
    );

    return res.status(200).json({
      message: "A fresh phone OTP has been sent.",
      cooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to send verification code") {
      return res.status(500).json({
        message: "Unable to send verification code. Check mail/SMS settings and try again.",
      });
    }
    return next(error);
  }
}

export async function getVerificationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const contact = req.query?.contact as string | undefined;
    if (!contact) {
      return res.status(400).json({ message: "Contact is required." });
    }

    const user = await findUserByContact(contact);
    if (!user) {
      return res.status(404).json({ message: "Unable to find verification status for this contact." });
    }

    const hasMinimumVerification = user.emailVerified || user.phoneVerified;
    const fullyVerified = user.emailVerified && user.phoneVerified;

    return res.status(200).json({
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      isVerified: user.isVerified,
      hasMinimumVerification,
      fullyVerified,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const anyReq = req as Request & { user?: { id: string } };
    const userId = anyReq.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } });
    }

    type UserWithWorkspace = {
      id: string;
      email: string | null;
      phone: string | null;
      firstName: string;
      lastName: string;
      role: string;
      workspaceId: string;
      emailVerified: boolean;
      phoneVerified: boolean;
      workspace: {
        id: string;
        name: string;
        workspaceType: "DEMO" | "PRODUCTION";
        billingStatus: "inactive" | "active" | "trialing";
        subscriptionStatus: "DEMO" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";
        onboardingCompleted: boolean;
        trialEndsAt: Date | null;
      };
    };

    // Check cache first to avoid duplicate query (buildAuthContext already queried this user)
    const cachedUser = getCachedUserById(userId) as UserWithWorkspace | null;
    const user =
      cachedUser ||
      (await (async () => {
        logger.info("auth", "db_user_lookup_start", { userId });
        try {
          return await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              role: true,
              workspaceId: true,
              emailVerified: true,
              phoneVerified: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  workspaceType: true,
                  billingStatus: true,
                  subscriptionStatus: true,
                  onboardingCompleted: true,
                  trialEndsAt: true,
                },
              },
            },
          });
        } finally {
          logger.info("auth", "db_user_lookup_end", { userId });
        }
      })());

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } });
    }

    const { workspaceBillingSnapshot } = await import("@/lib/workspace/snapshot");
    const { isDemoSandbox } = await import("@/lib/workspace/types");

    // Use cached data from buildAuthContext to avoid duplicate queries
    // The workspace owner is already fetched in buildAuthContext
    // NOTE: /api/auth/me should NOT load restaurant IDs - it's expensive and not needed
    const cachedAuth = getCachedAuthContext(userId) as AuthContext | null;
    let owner: { id: string } | undefined;

    if (cachedAuth) {
      owner = cachedAuth.workspaceOwnerId ? { id: cachedAuth.workspaceOwnerId } : undefined;
    } else {
      logger.info("auth", "db_workspace_lookup_start", { workspaceId: user.workspaceId });
      try {
        const workspaceOwner = await prisma.user.findFirst({
          where: { workspaceId: user.workspaceId },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });
        owner = workspaceOwner ?? undefined;
        if (owner) {
          cacheWorkspaceOwner(user.workspaceId, owner.id);
        }
      } finally {
        logger.info("auth", "db_workspace_lookup_end", { workspaceId: user.workspaceId });
      }
    }

    const billing = workspaceBillingSnapshot(user.workspace);
    const demoWorkspace = isDemoSandbox(billing);
    const role = normalizeRole(user.role, owner?.id === user.id, { demoWorkspace });
    const permissions = getPermissionsForRole(role);

    // Use the new account state helper with the minimal billing snapshot.
    const accountInfo = getAccountInfo(user, billing);

    const hasMinimumVerification = user.emailVerified || user.phoneVerified;
    const fullyVerified = user.emailVerified && user.phoneVerified;

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        role,
        permissions,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        hasMinimumVerification,
        fullyVerified,
        organization: {
          id: user.workspace.id,
          name: user.workspace.name,
          outletCount: 0,
          plan: "starter",
        },
        workspace: {
          id: user.workspace.id,
          name: user.workspace.name,
          outletCount: 0,
          workspaceType: user.workspace.workspaceType,
          billingStatus: user.workspace.billingStatus,
          subscriptionStatus: user.workspace.subscriptionStatus,
          onboardingCompleted: user.workspace.onboardingCompleted,
          trialEndsAt: user.workspace.trialEndsAt?.toISOString?.() ?? null,
          isDemo: demoWorkspace,
        },
        entitlements: {},
        outletAccess: 0,
      },
      data: {
        account: accountInfo,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req: Request, res: Response) {
  let userId: string | undefined;
  let workspaceId: string | undefined;

  try {
    const anyReq = req as Request & { user?: { id: string }; auth?: { workspaceId?: string } };
    userId = anyReq.user?.id;
    workspaceId = anyReq.auth?.workspaceId;

    const refreshCookie = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!userId && refreshCookie) {
      const [extractedUserId] = String(refreshCookie).split(".");
      userId = extractedUserId;
    }

    // Clear refresh token server-side
    if (userId) {
      await clearRefreshTokenForUserId(userId);
    }
  } catch {
    // Continue with cleanup even if server-side clear fails
  }

  // Clear all auth cookies
  clearAuthCookie(res);
  clearRefreshCookie(res);

  // Audit log
  const anyReq = req as Request & { user?: { id: string }; auth?: { workspaceId?: string } };
  writeAuditLog(
    {
      action: "auth.signout",
      userId: userId || anyReq.user?.id,
      workspaceId: workspaceId || anyReq.auth?.workspaceId,
      resource: "logout",
      requestId: (req as Request & { requestId?: string }).requestId,
    },
    req,
  );

  return res.status(200).json({ message: "Logged out successfully." });
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const cookie = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!cookie) {
      clearAuthCookie(res);
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parts = String(cookie).split(".");
    if (parts.length !== 2) {
      clearAuthCookie(res);
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [userId, token] = parts;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      clearAuthCookie(res);
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isSessionExpired(user.refreshTokenExpiresAt)) {
      await clearRefreshTokenForUserId(user.id);
      clearAuthCookie(res);
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Refresh token expired" });
    }

    const tokenHash = await hashToken(token);
    if (tokenHash !== user.refreshTokenHash) {
      // possible token theft or reuse - clear stored token
      await clearRefreshTokenForUserId(user.id);
      clearAuthCookie(res);
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Unauthorized" });
    }

    // rotate
    const newAccessToken = createToken(user.id, user.emailVerified, user.phoneVerified);
    sendTokenCookie(res, newAccessToken);
    await issueRefreshToken(user.id, res);

    logger.info("auth", "refresh_success", { userId });
    return res.status(200).json({ message: "Refreshed" });
  } catch (error) {
    logger.error("auth", "refresh_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return next(error);
  }
}
