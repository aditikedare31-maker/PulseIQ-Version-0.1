import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { provisionDemoWorkspaceOutlets, resolveCuratedDemoRestaurantIds } from "./demo-outlets";
import { getCachedWorkspaceOutlets, cacheWorkspaceOutlets } from "@/lib/request-cache";

export async function listAllRestaurantIds(): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT restaurant_id::text AS id FROM restaurants ORDER BY restaurant_name ASC
  `);
  return rows.map((r) => r.id);
}

async function ensureDemoWorkspaceRestaurantIds(workspaceId: string): Promise<string[]> {
  const existing = await prisma.workspaceOutlet.findMany({
    where: { workspaceId },
    select: { restaurantId: true },
  });

  if (existing.length > 0) {
    const curated = new Set(await resolveCuratedDemoRestaurantIds());
    const allowed = existing.map((row) => row.restaurantId).filter((id) => curated.has(id));
    if (allowed.length > 0) return allowed;
  }

  return provisionDemoWorkspaceOutlets(workspaceId);
}

/** Production workspaces start empty - no lazy provisioning. Outlets must be explicitly assigned. */
async function ensureProductionWorkspaceRestaurantIds(workspaceId: string): Promise<string[]> {
  const existing = await prisma.workspaceOutlet.findMany({
    where: { workspaceId },
    select: { restaurantId: true },
  });

  if (existing.length > 0) {
    return existing.map((row) => row.restaurantId);
  }

  // Production workspaces start with no outlets - empty state
  logger.info("tenant", "workspace_outlets_empty", {
    workspaceId,
    mode: "production_empty",
  });

  return [];
}

/** Ensures workspace has outlet links; demo uses curated mappings only. */
export async function ensureWorkspaceRestaurantIds(
  workspaceId: string,
  workspaceType?: string,
  subscriptionStatus?: string,
): Promise<string[]> {
  const started = Date.now();
  // Check request-level cache first to avoid duplicate queries in same request
  const cached = getCachedWorkspaceOutlets(workspaceId);
  if (cached) {
    logger.info("workspace_outlets", "cache_hit", {
      workspaceId,
      duration: Date.now() - started,
    });
    return cached.map((outlet: Record<string, unknown>) => outlet.restaurantId as string);
  }

  // Use provided workspaceType to avoid querying database if available
  let actualWorkspaceType = workspaceType;
  let actualSubscriptionStatus = subscriptionStatus;

  if (!actualWorkspaceType || !actualSubscriptionStatus) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { workspaceType: true, subscriptionStatus: true },
    });
    if (!workspace) return [];
    actualWorkspaceType = workspace.workspaceType;
    actualSubscriptionStatus = workspace.subscriptionStatus;
  }

  // Check for demo mode based on both workspaceType and subscriptionStatus
  // This fixes the issue where workspaceType is PRODUCTION but subscriptionStatus is DEMO
  const isDemo = actualWorkspaceType === "DEMO" || actualSubscriptionStatus === "DEMO";

  let restaurantIds: string[];
  if (isDemo) {
    logger.info("workspace_outlets", "demo_mode_resolved", {
      workspaceId,
      workspaceType: actualWorkspaceType,
      subscriptionStatus: actualSubscriptionStatus,
    });
    restaurantIds = await ensureDemoWorkspaceRestaurantIds(workspaceId);
  } else {
    restaurantIds = await ensureProductionWorkspaceRestaurantIds(workspaceId);
  }

  // Cache the result for this request
  cacheWorkspaceOutlets(
    workspaceId,
    restaurantIds.map((id) => ({ restaurantId: id })),
  );

  logger.info("workspace_outlets", "cache_populated", {
    workspaceId,
    workspaceType: actualWorkspaceType,
    subscriptionStatus: actualSubscriptionStatus,
    outletCount: restaurantIds.length,
    duration: Date.now() - started,
  });

  return restaurantIds;
}

export async function assertRestaurantInWorkspace(
  workspaceId: string,
  restaurantId: string,
  workspaceType?: string,
  subscriptionStatus?: string,
): Promise<boolean> {
  const allowed = await ensureWorkspaceRestaurantIds(workspaceId, workspaceType, subscriptionStatus);
  return allowed.includes(restaurantId);
}
