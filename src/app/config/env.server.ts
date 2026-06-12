import "server-only";

/**
 * Server-only environment configuration with fail-fast validation.
 *
 * This module validates all required environment variables at startup.
 * If any required variable is missing, the process exits immediately with
 * a clear error message — preventing silent misconfiguration in production.
 *
 * NEVER use fallback values for security-sensitive variables.
 * NEVER import this module into client components or client bundles.
 */

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn(
        `[CONFIG] WARN: Environment variable "${name}" is not set during build. Ensure it is available at runtime.`,
      );
      return `__BUILD_PLACEHOLDER_${name}__`;
    }

    throw new Error(
      `[CONFIG] FATAL: Missing required environment variable "${name}". Copy .env.example to .env and fill in all values.`,
    );
  }

  return value.trim();
}

function optionalEnv(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : defaultValue;
}

function optionalStringList(name: string, defaultValue: string[]): string[] {
  const value = process.env[name];
  if (!value || value.trim() === "") return defaultValue;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function optionalNumber(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return defaultValue;
  const parsed = Number(raw.trim());
  if (Number.isNaN(parsed)) {
    throw new Error(
      `[CONFIG] FATAL: Environment variable "${name}" must be a number, got: "${raw}"`,
    );
  }
  return parsed;
}

// ─── Security-critical (required, no fallback) ─────────────────────────────
/** Supports JWT_SECRET or legacy BETTER_AUTH_SECRET alias from deployment templates. */
function requireJwtSecret(): string {
  const value = process.env.JWT_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim();

  if (!value) {
    throw new Error(
      `[CONFIG] FATAL: Missing JWT_SECRET. Set JWT_SECRET or BETTER_AUTH_SECRET.`,
    );
  }

  return value;
}

export const JWT_SECRET = requireJwtSecret();
export const DATABASE_URL = requireEnv("DATABASE_URL");

// ─── Auth / Token settings ──────────────────────────────────────────────────
export const JWT_EXPIRES_IN = optionalEnv("JWT_EXPIRES_IN", "15m");
export const COOKIE_NAME = optionalEnv("COOKIE_NAME", "auth_token");
export const COOKIE_MAX_AGE = optionalNumber("COOKIE_MAX_AGE", 900); // 15 minutes
export const REFRESH_COOKIE_NAME = optionalEnv("REFRESH_COOKIE_NAME", "refresh_token");
export const REFRESH_TOKEN_TTL_MS = optionalNumber("REFRESH_TOKEN_TTL_MS", 1000 * 60 * 60 * 24 * 2); // 48h

// ─── OTP settings ───────────────────────────────────────────────────────────
export const OTP_TTL_MS = optionalNumber("OTP_TTL_MS", 1000 * 60 * 5); // 5 min
export const OTP_RESEND_COOLDOWN_MS = optionalNumber("OTP_RESEND_COOLDOWN_MS", 30 * 1000); // 30s
export const OTP_RESEND_WINDOW_MS = optionalNumber("OTP_RESEND_WINDOW_MS", 60 * 60 * 1000); // 1h
export const OTP_MAX_RESENDS = optionalNumber("OTP_MAX_RESENDS", 3);
export const OTP_MAX_ATTEMPTS = optionalNumber("OTP_MAX_ATTEMPTS", 3);
export const OTP_LOCK_MS = optionalNumber("OTP_LOCK_MS", 15 * 60 * 1000); // 15 min

// ─── Email / SMTP settings ───────────────────────────────────────────────────
export const EMAIL_FROM = optionalEnv("EMAIL_FROM", "no-reply@example.com");
export const SMTP_HOST = process.env.SMTP_HOST?.trim() || undefined;
export const SMTP_PORT = optionalNumber("SMTP_PORT", 587);
export const SMTP_SECURE = process.env.SMTP_SECURE === "true";
export const SMTP_USER = process.env.SMTP_USER?.trim() || undefined;
export const SMTP_PASS = process.env.SMTP_PASS?.trim() || undefined;
export const BREVO_API_KEY =
  process.env.BREVO_API_KEY?.trim() || process.env.BRAVO_API_KEY?.trim() || "";
export const BREVO_SMS_SENDER = optionalEnv("BREVO_SMS_SENDER", "PulseIQ");
export const SMS_DEV_MODE = process.env.SMS_DEV_MODE === "true";

// ─── Application settings ───────────────────────────────────────────────────
export const PORT = optionalNumber("PORT", 3000);
export const APP_ENV = optionalEnv("APP_ENV", process.env.NODE_ENV?.trim() || "development");
export const NEXT_PUBLIC_APP_ENV = optionalEnv("NEXT_PUBLIC_APP_ENV", APP_ENV);
export const NODE_ENV = optionalEnv("NODE_ENV", APP_ENV);
export const DEMO_MODE = optionalEnv("DEMO_MODE", "false");

/** Default dev frontends used during Next.js development. */
const DEV_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.204:3000",

  // Keep these commented only if you ever run a separate Vite frontend.
  // "http://localhost:5173",
  // "http://localhost:8080",
  // "http://127.0.0.1:5173",
  // "http://127.0.0.1:8080",
];

const configuredCorsOrigins = optionalStringList("CORS_ORIGIN", []);

// In development, always merge env origins with common local dev URLs so a
// .env that only lists :5173 does not block login from :8080.
export const CORS_ORIGINS =
  NODE_ENV === "development"
    ? [...new Set([...DEV_CORS_ORIGINS, ...configuredCorsOrigins])]
    : configuredCorsOrigins.length > 0
      ? configuredCorsOrigins
      : DEV_CORS_ORIGINS;

// ─── Validate on import ──────────────────────────────────────────────────────
// Calling requireEnv above already validates.
// Remove logging to prevent repeated output in development hot reloads
// Validation happens silently; errors will be logged by requireEnv if critical
