import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { APP_ENV, DATABASE_URL } from "@/app/config/env.server";
import { logger } from "./logger";

const QUERY_TIMEOUT_MS = 25_000;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  tablesChecked?: boolean;
  tablesValidationPromise?: Promise<void>;
};

const connectionString = DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for Prisma.");
}

if (!globalForPrisma.pgPool) {
  globalForPrisma.pgPool = new Pool({
    connectionString,
  });
}

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg(globalForPrisma.pgPool);

  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

async function validateAuthTables() {
  if (globalForPrisma.tablesChecked || process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  if (globalForPrisma.tablesValidationPromise) {
    return globalForPrisma.tablesValidationPromise;
  }

  globalForPrisma.tablesValidationPromise = (async () => {
    const client = globalForPrisma.prisma;
    if (!client) return;

    try {
      await client.$queryRaw`SELECT 1 FROM "users" LIMIT 1`;
      globalForPrisma.tablesChecked = true;
      logger.info("prisma", "auth_tables_validated");
    } catch (error) {
      logger.error("prisma", "auth_tables_missing", {
        error: error instanceof Error ? error.message : String(error),
      });

      if (APP_ENV === "production") {
        throw new Error(
          "[PRISMA] FATAL: Required auth tables not found. Run migrations before starting production.",
        );
      }

      console.warn(
        `[PRISMA] Required auth tables not found yet. Run 'pnpm prisma db push' or 'pnpm prisma migrate dev'.`,
      );
    }
  })();

  return globalForPrisma.tablesValidationPromise;
}

const base = globalForPrisma.prisma;

if (!base) {
  throw new Error("Prisma client failed to initialize.");
}

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const started = Date.now();

        const run = query(args);

        const result =
          QUERY_TIMEOUT_MS > 0
            ? await Promise.race([
                run,
                new Promise<never>((_, reject) => {
                  setTimeout(
                    () => reject(new Error(`Query timeout after ${QUERY_TIMEOUT_MS}ms`)),
                    QUERY_TIMEOUT_MS,
                  );
                }),
              ])
            : await run;

        logger.slowQuery("prisma", Date.now() - started, {
          model,
          operation,
        });

        return result;
      },
    },
  },
});

export type ExtendedPrismaClient = typeof prisma;

export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}