import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge proxy must not import from @/ paths or shared auth modules.
 * Those barrels can pull server-only code (prisma, env.ts process.exit, jwt, etc.)
 * and stall or break the proxy bundle on Windows dev.
 */

import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth/cookie-config";

/**
 * Simple JWT decoder for edge middleware.
 * NOTE: This does NOT verify the signature - it only decodes the payload.
 * The actual API routes will verify the signature properly.
 * This is safe for redirecting users to verification page because:
 * 1. If a user forges a token with false verification, they'll just be redirected to verify page
 * 2. The actual API routes will reject forged tokens with proper signature verification
 */
function decodeJwtPayload(token: string): { userId?: string; emailVerified?: boolean; phoneVerified?: boolean } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

const AUTH_COOKIE = AUTH_COOKIE_NAME;
const REFRESH_COOKIE = REFRESH_COOKIE_NAME;
const CSRF_COOKIE = "csrf_token";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/orders",
  "/inventory",
  "/outlets",
  "/reports",
  "/ai-insights",
  "/menu",
  "/customers",
  "/financial",
  "/integrations",
  "/notifications",
  "/settings",
  "/billing",
  "/import",
];

const AUTH_PAGES = ["/signin", "/signup", "/forgot-password", "/verify", "/verify-account"];

function hasRefreshSession(request: NextRequest): boolean {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return false;

  const parts = refresh.split(".");
  if (parts.length !== 2) return false;

  const [userId, token] = parts;
  return Boolean(userId && token && /^[a-zA-Z0-9-]+$/.test(userId) && token.length > 0);
}

function hasAuthSession(request: NextRequest): boolean {
  return Boolean(request.cookies.get(AUTH_COOKIE)?.value);
}

function createCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authTokenPresent = hasAuthSession(request);
  const refreshTokenLooksValid = hasRefreshSession(request);
  const sessionActive = authTokenPresent || refreshTokenLooksValid;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );

  // Protected routes require authentication
  if (isProtected && !sessionActive) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Phase 1: Protected routes require at least one verification method (email OR phone)
  if (isProtected && authTokenPresent) {
    const authToken = request.cookies.get(AUTH_COOKIE)?.value;
    if (authToken) {
      const payload = decodeJwtPayload(authToken);
      const hasMinimumVerification = (payload?.emailVerified === true) || (payload?.phoneVerified === true);
      
      if (!hasMinimumVerification) {
        const url = request.nextUrl.clone();
        url.pathname = "/verify-account";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  // Auth pages redirect to dashboard if the access token is present.
  if (isAuthPage && authTokenPresent) {
    const authToken = request.cookies.get(AUTH_COOKIE)?.value;
    if (authToken) {
      const payload = decodeJwtPayload(authToken);
      const hasMinimumVerification = (payload?.emailVerified === true) || (payload?.phoneVerified === true);
      
      // Only redirect to dashboard if user has minimum verification
      if (hasMinimumVerification) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  const response = NextResponse.next();

  // Set CSRF token for GET requests (non-API)
  if (request.method === "GET" && !pathname.startsWith("/api/")) {
    if (!request.cookies.get(CSRF_COOKIE)?.value) {
      response.cookies.set(CSRF_COOKIE, createCsrfToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    }
  }

  response.headers.set("X-DNS-Prefetch-Control", "force");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
