import { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "@/lib/auth/auth-context";
import type { RequestContext } from "@/lib/api/request";

export type ExpressLikeRequest = {
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
  cookies: Record<string, string>;
  ip?: string;
  path: string;
  originalUrl?: string;
  requestId?: string;
  correlationId?: string;
  // App-specific additions (mirrors old Express typing)
  auth?: AuthContext;
  user?: { id: string };
};

export type NextFunction = (err?: unknown) => void;

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  /**
   * Express-compatible maxAge in milliseconds.
   * This wrapper converts it to seconds for NextResponse.cookies.set().
   */
  maxAge?: number;
};

export class ExpressLikeResponse {
  private statusCode = 200;
  private headers = new Headers();
  private nextResponse: NextResponse | null = null;
  private pendingCookies: Array<{
    name: string;
    value: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    maxAge?: number;
  }> = [];

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  cookie(name: string, value: string, options?: CookieOptions) {
    const cookieOptions = {
      name,
      value,
      httpOnly: options?.httpOnly ?? true,
      secure: options?.secure ?? process.env.NODE_ENV === "production",
      sameSite: options?.sameSite ?? "lax",
      path: options?.path ?? "/",
      // Accept either milliseconds (legacy) or seconds. If value looks like
      // milliseconds (greater than 1000), convert to seconds for NextResponse.
      maxAge: typeof options?.maxAge === "number"
        ? options.maxAge > 1000
          ? Math.floor(options.maxAge / 1000)
          : Math.floor(options.maxAge)
        : undefined,
    };
    // console.log(`[EXPRESS_RESPONSE] cookie_set`, {
    //   name,
    //   hasValue: !!value,
    //   valueLength: value.length,
    //   options: cookieOptions,
    // });
    this.pendingCookies.push(cookieOptions);
  }

  clearCookie(name: string, options?: CookieOptions) {
    // console.log(`[EXPRESS_RESPONSE] cookie_cleared`, { name });
    this.pendingCookies.push({
      name,
      value: "",
      httpOnly: options?.httpOnly ?? true,
      secure: options?.secure,
      sameSite: options?.sameSite ?? "lax",
      path: options?.path ?? "/",
      maxAge: 0,
    });
  }

  json(data: unknown) {
    const res = NextResponse.json(data, { status: this.statusCode });
    this.nextResponse = res;
    this.applyHeaders();
    this.applyCookies();
    return res;
  }

  send(body: BodyInit) {
    const res = new NextResponse(body, { status: this.statusCode });
    this.nextResponse = res;
    this.applyHeaders();
    this.applyCookies();
    return res;
  }

  toNextResponse() {
    this.ensureResponse();
    // const cookies = this.nextResponse?.cookies.getAll() ?? [];
    // console.log(`[EXPRESS_RESPONSE] to_next_response`, {
    //   cookieCount: cookies.length,
    //   cookies: cookies.map((c) => ({ name: c.name, hasValue: !!c.value })),
    // });
    this.applyHeaders();
    this.applyCookies();
    return this.nextResponse!;
  }

  private ensureResponse() {
    if (!this.nextResponse) {
      this.nextResponse = new NextResponse(null, { status: this.statusCode });
    }
  }

  private applyHeaders() {
    if (!this.nextResponse) return;
    // Merge setHeader() values into the outgoing response.
    this.headers.forEach((value, key) => this.nextResponse!.headers.set(key, value));
  }

  private applyCookies() {
    if (!this.nextResponse) return;
    this.pendingCookies.forEach((cookie) => this.nextResponse!.cookies.set(cookie));
    this.pendingCookies = [];
  }
}

export async function createExpressLikeContext(opts: {
  request: NextRequest;
  ctx: RequestContext;
  auth?: AuthContext;
  body?: Record<string, unknown>;
}): Promise<{ req: ExpressLikeRequest; res: ExpressLikeResponse }> {
  const url = new URL(opts.request.url);
  const headers: Record<string, string> = {};
  opts.request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const cookies: Record<string, string> = {};
  opts.request.cookies.getAll().forEach((c) => {
    cookies[c.name] = c.value;
  });

  const req: ExpressLikeRequest = {
    method: opts.request.method,
    headers,
    query,
    body: opts.body ?? {},
    cookies,
    ip: opts.ctx.ip,
    path: url.pathname,
    originalUrl: `${url.pathname}${url.search}`,
    requestId: opts.ctx.requestId,
    correlationId: opts.ctx.correlationId,
    auth: opts.auth,
    user: opts.auth ? { id: opts.auth.userId } : undefined,
  };

  return { req, res: new ExpressLikeResponse() };
}
