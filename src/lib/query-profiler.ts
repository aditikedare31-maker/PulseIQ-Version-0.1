import { logger } from "@/lib/logger";

/**
 * Query execution profiler for identifying slow database queries
 * Logs timing information for analysis
 */

export interface QueryMetrics {
  name: string;
  duration: number;
  slow: boolean;
  threshold: number;
}

const SLOW_QUERY_THRESHOLD = 500; // ms

export async function profileQuery<T>(
  name: string,
  fn: () => Promise<T>,
  threshold: number = SLOW_QUERY_THRESHOLD,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    if (duration > threshold) {
      logger.warn("query_slow", `${name} took ${duration.toFixed(2)}ms`, {
        query: name,
        duration: Math.round(duration),
        threshold,
      });
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error("query_error", `${name} failed after ${duration.toFixed(2)}ms`, {
      query: name,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function profileQueryBatch<T>(
  batchName: string,
  queries: Array<{
    name: string;
    fn: () => Promise<unknown>;
    threshold?: number;
  }>,
): Promise<T[]> {
  const start = performance.now();
  const results = await Promise.all(
    queries.map(({ name, fn, threshold }) =>
      profileQuery(name, fn, threshold || SLOW_QUERY_THRESHOLD),
    ),
  );
  const totalDuration = performance.now() - start;

  logger.info("query_batch", `${batchName} completed in ${totalDuration.toFixed(2)}ms`, {
    batchName,
    queryCount: queries.length,
    totalDuration: Math.round(totalDuration),
  });

  return results as T[];
}
