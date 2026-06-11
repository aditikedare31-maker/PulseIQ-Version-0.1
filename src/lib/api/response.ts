import { NextResponse } from "next/server";
import { isApiError } from "./errors";
import type { RequestContext } from "./request";

export function applyContextHeaders(res: NextResponse, ctx: RequestContext) {
  res.headers.set("X-Request-Id", ctx.requestId);
  res.headers.set("X-Correlation-Id", ctx.correlationId);
  return res;
}

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, { status: 200, ...init });
}

export function jsonNoContent() {
  return new NextResponse(null, { status: 204 });
}

export function jsonError(error: unknown) {
  if (isApiError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  if (
    error instanceof Error &&
    (error.message.includes("Authentication failed against database server") ||
      error.message.includes("Can't reach database server") ||
      error.message.includes("Timed out fetching a new connection"))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            "Database connection failed. Verify DATABASE_URL and database availability before signing in.",
          code: "DATABASE_UNAVAILABLE",
        },
      },
      { status: 503 },
    );
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : error instanceof Error
      ? error.message
      : "Internal Server Error";

  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: "INTERNAL_SERVER_ERROR",
      },
    },
    { status: 500 },
  );
}
