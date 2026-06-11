import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

export type RequestContext = {
  requestId: string;
  correlationId: string;
  ip?: string;
};

export function buildRequestContext(request: NextRequest): RequestContext {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  const correlationId =
    request.headers.get("x-correlation-id") || request.headers.get("x-request-id") || requestId;

  // Best-effort IP extraction. (Vercel/Proxies set x-forwarded-for)
  const ip =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    undefined;

  return { requestId, correlationId, ip };
}

export async function readJson<T = unknown>(request: NextRequest): Promise<T> {
  // Some endpoints (e.g. webhooks) may send non-JSON bodies; callers should handle.
  return (await request.json()) as T;
}

export function queryObject(request: NextRequest): Record<string, string> {
  const url = new URL(request.url);
  const out: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
