/** Edge-safe auth cookie names (no process.exit). */
export const AUTH_COOKIE_NAME = process.env.COOKIE_NAME?.trim() || "auth_token";
export const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME?.trim() || "refresh_token";
