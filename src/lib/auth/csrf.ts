/**
 * CSRF Protection
 *
 * Implements CSRF token generation and validation using double-submit cookie pattern.
 * Tokens are generated on GET requests and validated on state-changing operations.
 */

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a random CSRF token using Web Crypto API
 */
export async function generateCSRFToken(): Promise<string> {
  const cryptoObject = typeof crypto !== "undefined" ? crypto : undefined;

  if (cryptoObject?.getRandomValues) {
    const array = new Uint8Array(CSRF_TOKEN_LENGTH);
    cryptoObject.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  throw new Error("Secure crypto API is unavailable.");
}

/**
 * Validate CSRF token from request against cookie
 */
export function validateCSRFToken(
  requestToken: string | null,
  cookieToken: string | null,
): boolean {
  if (!requestToken || !cookieToken) {
    return false;
  }
  return requestToken === cookieToken;
}

/**
 * Get CSRF cookie name
 */
export function getCSRFCookieName(): string {
  return CSRF_COOKIE_NAME;
}

/**
 * Get CSRF token length
 */
export function getCSRFTokenLength(): number {
  return CSRF_TOKEN_LENGTH;
}
