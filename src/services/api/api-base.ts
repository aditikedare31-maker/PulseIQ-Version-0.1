/**
 * Normalized API root.
 *
 * Browser/client requests should always use relative `/api`
 * so the same code works on localhost, Vercel, and production domains.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }

  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
  const trimmed = String(raw).trim().replace(/\/$/, "");

  /**
   * Future support:
   * If you ever split backend to Express/Nest on port 4040,
   * this keeps old config working.
   */
  if (
    trimmed === "http://localhost:4040" ||
    trimmed === "http://127.0.0.1:4040"
  ) {
    return `${trimmed}/api`;
  }

  return trimmed || "/api";
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;

  return `${base}${suffix}`;
}