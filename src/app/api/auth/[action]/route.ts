import { NextRequest, NextResponse } from "next/server";
import { buildRequestContext } from "@/lib/api/request";
import { applyContextHeaders, jsonError } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createExpressLikeContext } from "@/lib/compat/express";
import { getAuthFromRequest } from "@/lib/auth/server-auth";
import { parseBody } from "@/lib/api/validate";
import { withRequestCache } from "@/lib/request-cache";
import {
  resendOtpSchema,
  signInSchema,
  signUpSchema,
  verifyOtpSchema,
} from "@/lib/validators/auth.validators";
import {
  signIn,
  signUp,
  verifyOtp,
  resendOtp,
  refreshToken,
  getMe,
  logout,
} from "@/services/controllers/auth.controller";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  return withRequestCache(async () => {
    const ctx = buildRequestContext(request);

    try {
      const { action } = await params;
      if (action !== "me") {
        return applyContextHeaders(
          NextResponse.json({ message: "Not found." }, { status: 404 }),
          ctx,
        );
      }

      const auth = await getAuthFromRequest(request);

      // Fast path for unauthenticated requests - return 401 immediately
      if (!auth) {
        return applyContextHeaders(
          NextResponse.json(
            { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
            { status: 401 },
          ),
          ctx,
        );
      }

      const { req, res } = await createExpressLikeContext({
        request,
        ctx,
        auth: auth ?? undefined,
      });
      const next = (err?: unknown) => {
        if (err) throw err;
      };

      await getMe(req, res, next);
      return applyContextHeaders(res.toNextResponse(), ctx);
    } catch (error) {
      return applyContextHeaders(jsonError(error), ctx);
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  return withRequestCache(async () => {
    const ctx = buildRequestContext(request);

    try {
      const { action } = await params;
      const ipKey = ctx.ip ?? "unknown";

      // Rate limiting (best-effort in-memory; swap to shared store in production).
      if (action === "signup") {
        enforceRateLimit({
          key: `auth:signup:${ipKey}`,
          windowMs: 10 * 60 * 1000,
          max: 5,
          message: "Too many signup attempts. Please try again in 10 minutes.",
        });
      } else if (action === "signin") {
        enforceRateLimit({
          key: `auth:signin:${ipKey}`,
          windowMs: 10 * 60 * 1000,
          max: 5,
          message: "Too many sign-in attempts. Please try again in 10 minutes.",
        });
      } else if (action === "verify" || action === "verify-otp") {
        enforceRateLimit({
          key: `auth:verify:${ipKey}`,
          windowMs: 10 * 60 * 1000,
          max: 5,
          message: "Too many verification attempts. Please try again later.",
        });
      } else if (action === "resend-otp" || action === "resend-verification") {
        enforceRateLimit({
          key: `auth:resend:${ipKey}`,
          windowMs: 10 * 60 * 1000,
          max: 5,
          message: "Too many resend requests. Please try again in 10 minutes.",
        });
      } else if (action === "refresh") {
        enforceRateLimit({
          key: `auth:refresh:${ipKey}`,
          windowMs: 15 * 60 * 1000,
          max: 60,
          message: "Too many session refresh attempts. Please sign in again.",
        });
      }

      const shouldReadBody = !["logout", "refresh"].includes(action);
      const rawBody = shouldReadBody ? await request.json().catch(() => undefined) : undefined;
      const body =
        action === "signup"
          ? parseBody(signUpSchema, rawBody)
          : action === "signin"
            ? parseBody(signInSchema, rawBody)
            : action === "verify" || action === "verify-otp"
              ? parseBody(verifyOtpSchema, rawBody)
              : action === "resend-otp" || action === "resend-verification"
                ? parseBody(resendOtpSchema, rawBody)
                : rawBody;

      const auth = action === "logout" ? await getAuthFromRequest(request) : null;
      const { req, res } = await createExpressLikeContext({
        request,
        ctx,
        auth: auth ?? undefined,
        body,
      });
      const next = (err?: unknown) => {
        if (err) throw err;
      };

      if (action === "signup") {
        await signUp(req, res, next);
      } else if (action === "signin") {
        await signIn(req, res, next);
      } else if (action === "verify" || action === "verify-otp") {
        await verifyOtp(req, res, next);
      } else if (action === "resend-otp" || action === "resend-verification") {
        await resendOtp(req, res, next);
      } else if (action === "refresh") {
        await refreshToken(req, res, next);
      } else if (action === "logout") {
        await logout(req, res);
      } else {
        return applyContextHeaders(
          NextResponse.json({ message: "Not found." }, { status: 404 }),
          ctx,
        );
      }

      return applyContextHeaders(res.toNextResponse(), ctx);
    } catch (error) {
      return applyContextHeaders(jsonError(error), ctx);
    }
  });
}
