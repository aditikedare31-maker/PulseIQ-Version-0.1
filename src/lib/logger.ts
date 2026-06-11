type LogLevel = "info" | "warn" | "error";

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, (_key, currentValue) =>
      typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
    );
  } catch {
    return JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      scope: "logger",
      message: "failed_to_serialize_log_entry",
    });
  }
}

function write(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...meta,
  };
  const line = safeStringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (scope: string, message: string, meta?: Record<string, unknown>) =>
    write("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) =>
    write("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) =>
    write("error", scope, message, meta),
  slowQuery: (scope: string, durationMs: number, meta?: Record<string, unknown>) => {
    if (durationMs < 500) return;
    write(durationMs > 2000 ? "warn" : "info", scope, "slow_query", { durationMs, ...meta });
  },
};
