/**
 * Session Handler
 *
 * Centralized session management for authentication flows.
 * Handles session expiration, refresh logic, and cleanup.
 */

import { ApiError } from "@/lib/api/errors";

/**
 * Session error types for consistent error handling
 */
export enum SessionErrorCode {
  EXPIRED = "SESSION_EXPIRED",
  INVALID = "SESSION_INVALID",
  TOKEN_MISSING = "TOKEN_MISSING",
  REFRESH_FAILED = "REFRESH_FAILED",
}

/**
 * Session error class for consistent error responses
 */
export class SessionError extends ApiError {
  constructor(code: SessionErrorCode, message: string) {
    super(401, message, { code });
  }
}

/**
 * Check if a session is expired based on expiration timestamp
 */
export function isSessionExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
}

/**
 * Validate session and throw appropriate error if invalid
 */
export function validateSession(token: string | null, expiresAt: Date | null): void {
  if (!token) {
    throw new SessionError(SessionErrorCode.TOKEN_MISSING, "Authentication token is required.");
  }

  if (isSessionExpired(expiresAt)) {
    throw new SessionError(SessionErrorCode.EXPIRED, "Session has expired. Please sign in again.");
  }
}

/**
 * Create a standardized session expired error response
 */
export function createSessionExpiredError(): ApiError {
  return new SessionError(SessionErrorCode.EXPIRED, "Session has expired. Please sign in again.");
}

/**
 * Create a standardized unauthorized error response
 */
export function createUnauthorizedError(): ApiError {
  return new ApiError(401, "Unauthorized. Please sign in to continue.");
}
