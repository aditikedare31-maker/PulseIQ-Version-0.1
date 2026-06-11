/**
 * Client-safe environment configuration.
 *
 * Only NEXT_PUBLIC_* values should be used here.
 * Never add JWT_SECRET, DATABASE_URL, SMTP_PASS, or other secrets.
 */

function optionalPublicEnv(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : defaultValue;
}

export const NEXT_PUBLIC_APP_ENV = optionalPublicEnv(
  "NEXT_PUBLIC_APP_ENV",
  process.env.NODE_ENV === "production" ? "production" : "development",
);

export const APP_ENV = NEXT_PUBLIC_APP_ENV;
