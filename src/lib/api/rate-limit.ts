import { ApiError } from "./errors";

type Hit = { resetAt: number; count: number };

// NOTE: This is a best-effort in-memory limiter suitable for local dev and single
// Node processes. For production serverless, replace with a shared store (Upstash,
// Redis, etc.).
const buckets = new Map<string, Hit>();

export function enforceRateLimit(opts: {
  key: string;
  windowMs: number;
  max: number;
  message: string;
}) {
  const now = Date.now();
  const existing = buckets.get(opts.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(opts.key, { resetAt: now + opts.windowMs, count: 1 });
    return;
  }

  existing.count += 1;
  if (existing.count > opts.max) {
    throw new ApiError(429, opts.message, { code: "RATE_LIMITED" });
  }
}
