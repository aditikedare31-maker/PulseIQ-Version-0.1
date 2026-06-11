import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/** Shared curated demo dataset — every demo workspace sees the same impressive outlets. */
export const DEMO_OUTLET_LIMIT = 6;

type PrismaTx = Prisma.TransactionClient | typeof prisma;

function parseEnvCuratedIds(): string[] {
  const raw = process.env.DEMO_CURATED_OUTLET_IDS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, DEMO_OUTLET_LIMIT);
}

/** Top-performing outlets from the seeded analytics dataset (deterministic across environments). */
export async function resolveCuratedDemoRestaurantIds(
  client: PrismaTx = prisma,
): Promise<string[]> {
  const fromEnv = parseEnvCuratedIds();
  if (fromEnv.length > 0) return fromEnv;

  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT restaurant_id::text AS id
    FROM restaurants
    ORDER BY premium_score DESC, operational_efficiency_score DESC, restaurant_name ASC
    LIMIT ${DEMO_OUTLET_LIMIT}
  `;

  if (rows.length > 0) {
    return rows.map((row) => row.id);
  }

  const fallbackRows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT restaurant_id::text AS id
    FROM restaurants
    ORDER BY restaurant_name ASC
    LIMIT ${DEMO_OUTLET_LIMIT}
  `;

  return fallbackRows.map((row) => row.id);
}

/** Attach curated demo outlets at signup — never uses modulo partitioning. */
export async function provisionDemoWorkspaceOutlets(
  workspaceId: string,
  client: PrismaTx = prisma,
): Promise<string[]> {
  const restaurantIds = await resolveCuratedDemoRestaurantIds(client);

  if (restaurantIds.length === 0) {
    logger.warn("tenant", "demo_outlets_empty", { workspaceId });
    return [];
  }

  await client.workspaceOutlet.createMany({
    data: restaurantIds.map((restaurantId) => ({ workspaceId, restaurantId })),
    skipDuplicates: true,
  });

  logger.info("tenant", "demo_outlets_provisioned", {
    workspaceId,
    outletCount: restaurantIds.length,
  });

  return restaurantIds;
}
