import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { AuditLogInput } from "./types";

type AuditRequest = {
  ip?: string;
  requestId?: string;
  headers?: Record<string, unknown>;
};

function clientIp(req?: AuditRequest): string | null {
  if (!req) return null;
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return req.ip ?? null;
}

function clientUserAgent(req?: AuditRequest): string | null {
  const ua = req?.headers?.["user-agent"];
  return typeof ua === "string" ? ua.slice(0, 512) : null;
}

function auditRequestId(req?: AuditRequest): string | null {
  const headerRequestId = req?.headers?.["x-request-id"];
  if (typeof headerRequestId === "string" && headerRequestId.trim()) {
    return headerRequestId.trim();
  }
  return req?.requestId ?? null;
}

function toJsonSafe(value: Record<string, unknown>) {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, currentValue) =>
        typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
      ),
    );
  } catch {
    return { serializationError: true };
  }
}

/** Production-safe structured audit record (stdout + DB for later querying). */
export function writeAuditLog(
  input: AuditLogInput,
  req?: AuditRequest,
) {
  const meta = input.meta ?? {};
  const safeMeta = Object.keys(meta).length ? toJsonSafe(meta) : undefined;

  const record = {
    ts: new Date().toISOString(),
    action: input.action,
    outcome: input.outcome ?? "success",
    userId: input.userId ?? null,
    workspaceId: input.workspaceId ?? null,
    orgId: input.workspaceId ?? null,
    ip: input.ip ?? clientIp(req) ?? null,
    userAgent: input.userAgent ?? clientUserAgent(req) ?? null,
    resource: input.resource ?? null,
    requestId: input.requestId ?? auditRequestId(req) ?? null,
    meta: safeMeta ?? {},
  };

  logger.info("audit", input.action, record);

  void prisma.auditLog
    .create({
      data: {
        action: record.action,
        outcome: record.outcome,
        userId: record.userId ?? undefined,
        workspaceId: record.workspaceId ?? undefined,
        ip: record.ip ?? undefined,
        userAgent: record.userAgent ?? undefined,
        resource: record.resource ?? undefined,
        requestId: record.requestId ?? undefined,
        meta: safeMeta,
      },
    })
    .catch((error: unknown) => {
      logger.error("audit", "persist_failed", {
        action: input.action,
        error: error instanceof Error ? error.message : String(error),
      });
    });
}
