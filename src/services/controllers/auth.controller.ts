import "server-only";
import type {
  ExpressLikeRequest as Request,
  ExpressLikeResponse as Response,
  NextFunction,
} from "@/lib/compat/express";
import type { Prisma } from "@prisma/client";
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

function createToken(userId: string) {
  const token = jwt.sign({ userId }, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  logger.info("auth", "jwt_created", {
    userId,
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
  otpHash: true,
  otpExpiresAt: true,
  otpAttempts: true,
  otpResendCount: true,
  otpLastSentAt: true,
  otpLockedUntil: true,
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

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return res.status(409).json({ message: "An account already exists for this email." });
    }

    const existingByPhone = await prisma.user.findFirst({
      where: { OR: phoneLookupVariants(phone).map((variant) => ({ phone: variant })) },
    });
    if (existingByPhone) {
      return res.status(409).json({ message: "An account already exists for this mobile number." });
    }

    const signupStart = Date.now();

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    logger.info("auth", "signup_password_hash_start", {});
    const passwordHashStart = Date.now();
    const hashedPassword = await bcrypt.hash(String(password), 12);
    logger.info("auth", "signup_password_hash_end", { durationMs: Date.now() - passwordHashStart });
    const now = new Date();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // For Phase 1, signup always creates a production trial workspace.
    const workspaceType = "PRODUCTION" as const;
    const subscriptionStatus = "TRIALING" as const;
    const billingStatus = "trialing" as const;
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    logger.info("auth", "signup_db_tx_start", {});
    const dbTxStart = Date.now();
    const user = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          password: hashedPassword,
          isVerified: false,
          otpHash,
          otpExpiresAt: expiresAt,
          otpAttempts: 0,
          otpResendCount: 1,
          otpLastSentAt: now,
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
    });

    logger.info("auth", "signup_db_tx_end", { durationMs: Date.now() - dbTxStart });

    logger.info("auth", "signup_total", { durationMs: Date.now() - signupStart });

    const otpSent = await sendOtp({ email: user.email ?? undefined }, otp);
    if (!otpSent) {
      return res.status(500).json({
        message:
          "Account created, but verification code could not be sent. Please use resend OTP.",
        contact: email,
        requiresVerification: true,
      });
    }

    writeAuditLog(
      {
        action: "auth.signup",
        userId: user.id,
        workspaceId: (user as unknown as { workspace?: { id?: string } }).workspace?.id,
        resource: "signup",
      },
      req,
    );

    logger.info("auth", "signup_success", { userId: user.id, email: user.email });

    return res.status(201).json({
      message: "Account created successfully. A verification code was sent to your email.",
      requiresVerification: true,
      contact: email,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        workspace: {
          id: (user as unknown as { workspace?: { id?: string; name?: string; billingPhoneNumber?: string } }).workspace?.id,
          name: (user as unknown as { workspace?: { id?: string; name?: string; billingPhoneNumber?: string } }).workspace?.name,
          billingPhoneNumber: (user as unknown as { workspace?: { id?: string; name?: string; billingPhoneNumber?: string } }).workspace?.billingPhoneNumber,
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

    if (!user.isVerified) {
      logger.info("auth", "signin_response_ready", { status: 403, durationMs: Date.now() - requestStart });
      return res
        .status(403)
        .json({ message: "Account verification is required before signing in." });
    }

    logger.info("auth", "jwt_create_start", { userId: user.id });
    const jwtCreateStart = Date.now();
    const token = createToken(user.id);
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

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const contact = body.contact as string | undefined;
    const code = body.code as string | number | undefined;

    if (!contact || !code) {
      return res.status(400).json({ message: "Contact and OTP code are required." });
    }

    if (!/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ message: "OTP code must be a 6-digit number." });
    }

    const user = await findUserByContact(contact);
    if (!user) {
      writeAuditLog(
        { action: "auth.verify_otp_failed", outcome: "failure", resource: "verify" },
        req,
      );
      return res.status(400).json({ message: "Unable to verify the provided contact and code." });
    }

    if (user.isVerified) {
      return res.status(200).json({ message: "Account is already verified." });
    }

    const now = new Date();
    if (user.otpLockedUntil && user.otpLockedUntil > now) {
      return res
        .status(429)
        .json({ message: "Too many invalid attempts. Please try again later." });
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: "No OTP is available. Please request a new code." });
    }

    if (user.otpExpiresAt < now) {
      return res.status(400).json({ message: "OTP has expired. Please resend a new code." });
    }

    const isValidOtp = await bcrypt.compare(String(code), String(user.otpHash));
    if (!isValidOtp) {
      const attempts = (user.otpAttempts ?? 0) + 1;
      const updateData: Prisma.UserUpdateInput = { otpAttempts: attempts };

      if (attempts >= OTP_MAX_ATTEMPTS) {
        updateData.otpLockedUntil = new Date(Date.now() + OTP_LOCK_MS);
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });

      writeAuditLog(
        {
          action: "auth.verify_otp_failed",
          outcome: "failure",
          userId: user.id,
          workspaceId: user.workspaceId,
          resource: "verify",
        },
        req,
      );
      return res.status(400).json({ message: "Invalid OTP code." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpResendCount: 0,
        otpLastSentAt: null,
        otpLockedUntil: null,
      },
    });

    const token = createToken(user.id);
    sendTokenCookie(res, token);
    await issueRefreshToken(user.id, res);

    writeAuditLog(
      {
        action: "auth.verify_otp",
        userId: user.id,
        workspaceId: user.workspaceId,
        resource: "verify",
      },
      req,
    );

    logger.info("auth", "verify_otp_success", { userId: user.id, email: user.email });
    logger.info("auth", "session_created", { userId: user.id, tokenTTL: JWT_EXPIRES_IN });

    const workspaceOwner = await prisma.user.findFirst({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const isWorkspaceOwner = workspaceOwner?.id === user.id;
    const normalizedRole = normalizeRole(user.role, isWorkspaceOwner);
    const permissions = getPermissionsForRole(normalizedRole);

    return res.status(200).json({
      message: "Account verified successfully.",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        activeWorkspaceId: user.workspaceId,
        activeWorkspaceName: user.workspace.name,
        role: normalizedRole,
        permissions,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function resendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as Record<string, unknown>;
    const contact = body.contact as string | undefined;

    if (!contact) {
      return res.status(400).json({ message: "Contact is required." });
    }

    const user = await findUserByContact(contact);
    if (!user) {
      return res
        .status(200)
        .json({ message: "If this account exists, a fresh OTP has been sent." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified." });
    }

    const now = new Date();
    if (
      user.otpLastSentAt &&
      now.getTime() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      return res.status(429).json({ message: "Please wait before requesting another code." });
    }

    let resendCount = user.otpResendCount ?? 0;
    if (user.otpLastSentAt && now.getTime() - user.otpLastSentAt.getTime() > OTP_RESEND_WINDOW_MS) {
      resendCount = 0;
    }

    if (resendCount >= OTP_MAX_RESENDS) {
      return res.status(429).json({ message: "Resend limit reached. Please try again later." });
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          otpHash,
          otpExpiresAt: expiresAt,
          otpAttempts: 0,
          otpResendCount: resendCount + 1,
          otpLastSentAt: now,
          otpLockedUntil: null,
        },
      });

      const otpSent = await sendOtp(
        { email: user.email ?? undefined, phone: user.phone ?? undefined },
        otp,
      );
      if (!otpSent) {
        throw new Error("Failed to send verification code");
      }
    });

    writeAuditLog(
      {
        action: "auth.resend_otp",
        userId: user.id,
        workspaceId: user.workspaceId,
        resource: "resend-otp",
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
    const newAccessToken = createToken(user.id);
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
