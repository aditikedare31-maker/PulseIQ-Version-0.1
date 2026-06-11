import type { ZodError, ZodSchema } from "zod";
import { ApiError } from "./errors";

function formatZod(error: ZodError) {
  return error.issues.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

export function parseBody<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, result.error.issues[0]?.message ?? "Validation failed.", {
      code: "VALIDATION_ERROR",
      details: { errors: formatZod(result.error) },
    });
  }
  return result.data;
}

export function parseQuery<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, result.error.issues[0]?.message ?? "Invalid query parameters.", {
      code: "QUERY_VALIDATION_ERROR",
      details: { errors: formatZod(result.error) },
    });
  }
  return result.data;
}
