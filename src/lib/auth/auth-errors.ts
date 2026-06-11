/**
 * Authentication Error Handling
 *
 * Standardized error types and messages for authentication failures.
 * Provides consistent error responses across the application.
 */

import { ApiError } from "@/lib/api/errors";
import { SessionError, SessionErrorCode } from "./session-handler";

/**
 * Authentication error codes for consistent error handling
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  ACCOUNT_NOT_VERIFIED = "ACCOUNT_NOT_VERIFIED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  OTP_EXPIRED = "OTP_EXPIRED",
  OTP_INVALID = "OTP_INVALID",
  OTP_RATE_LIMITED = "OTP_RATE_LIMITED",
  RESEND_LIMITED = "RESEND_LIMITED",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  TOKEN_INVALID = "TOKEN_INVALID",
}

/**
 * Create standardized authentication errors
 */
export class AuthError extends ApiError {
  constructor(code: AuthErrorCode, message: string, details?: Record<string, unknown>) {
    super(401, message, { code, ...details });
  }
}

/**
 * Create forbidden error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(
    message: string = "You do not have permission to perform this action.",
    details?: Record<string, unknown>,
  ) {
    super(403, message, { code: "FORBIDDEN", ...details });
  }
}

/**
 * Error message mappings for common auth scenarios
 */
export const AUTH_ERROR_MESSAGES = {
  [AuthErrorCode.INVALID_CREDENTIALS]:
    "Invalid credentials. Please check your email/phone and password.",
  [AuthErrorCode.ACCOUNT_NOT_VERIFIED]: "Account verification is required before signing in.",
  [AuthErrorCode.ACCOUNT_LOCKED]:
    "Account is locked due to too many failed attempts. Please contact support.",
  [AuthErrorCode.OTP_EXPIRED]: "OTP has expired. Please request a new code.",
  [AuthErrorCode.OTP_INVALID]: "Invalid OTP code. Please try again.",
  [AuthErrorCode.OTP_RATE_LIMITED]: "Too many verification attempts. Please try again later.",
  [AuthErrorCode.RESEND_LIMITED]: "Resend limit reached. Please try again later.",
  [AuthErrorCode.UNAUTHORIZED]: "Unauthorized. Please sign in to continue.",
  [AuthErrorCode.FORBIDDEN]: "You do not have permission to perform this action.",
  [AuthErrorCode.SESSION_EXPIRED]: "Session has expired. Please sign in again.",
  [AuthErrorCode.TOKEN_INVALID]: "Invalid authentication token.",
};

/**
 * Create authentication error with standardized message
 */
export function createAuthError(code: AuthErrorCode, details?: Record<string, unknown>): AuthError {
  const message = AUTH_ERROR_MESSAGES[code];
  return new AuthError(code, message, details);
}

/**
 * Create session expired error
 */
export function createSessionExpiredError(): SessionError {
  return new SessionError(
    SessionErrorCode.EXPIRED,
    AUTH_ERROR_MESSAGES[AuthErrorCode.SESSION_EXPIRED],
  );
}

/**
 * Create unauthorized error
 */
export function createUnauthorizedError(): AuthError {
  return createAuthError(AuthErrorCode.UNAUTHORIZED);
}

/**
 * Create forbidden error
 */
export function createForbiddenError(
  message?: string,
  details?: Record<string, unknown>,
): ForbiddenError {
  return new ForbiddenError(message, details);
}
