import { NextRequest } from "next/server";
import { requireAuth } from "./server-auth";
import { hasPermission, requirePermission, type Permission } from "./permissions";
import type { UserRole } from "./roles";
import { ApiError } from "@/lib/api/errors";

/**
 * Get current authenticated user with workspace context
 */
export async function getCurrentUser(request: NextRequest) {
  const auth = await requireAuth(request);
  return auth;
}

/**
 * Get current workspace from auth context
 */
export async function getCurrentWorkspace(request: NextRequest) {
  const auth = await requireAuth(request);
  return auth.workspace;
}

/**
 * Get current user's role
 */
export async function getCurrentRole(request: NextRequest): Promise<UserRole> {
  const auth = await requireAuth(request);
  return auth.role;
}

/**
 * Check if user has specific permission
 */
export async function checkPermission(
  request: NextRequest,
  permission: Permission,
): Promise<boolean> {
  const auth = await requireAuth(request);
  return hasPermission(auth.role, permission);
}

/**
 * Require user to have specific permission, throw error if not
 */
export async function requireUserPermission(
  request: NextRequest,
  permission: Permission,
): Promise<void> {
  const auth = await requireAuth(request);
  requirePermission(auth.role, permission);
}

/**
 * Require user to have specific role or higher
 */
export async function requireRole(request: NextRequest, minimumRole: UserRole): Promise<void> {
  const auth = await requireAuth(request);
  const { roleAtLeast } = await import("./roles");
  if (!roleAtLeast(auth.role, minimumRole)) {
    throw new ApiError(403, "You do not have permission to perform this action.", {
      code: "FORBIDDEN",
    });
  }
}

/**
 * Get workspace-scoped restaurant IDs for current user
 */
export async function getWorkspaceRestaurantIds(request: NextRequest): Promise<string[]> {
  const auth = await requireAuth(request);
  return auth.restaurantIds;
}

/**
 * Ensure query is scoped to current workspace
 * Returns the workspaceId to use in queries
 */
export async function requireWorkspaceScope(request: NextRequest): Promise<string> {
  const auth = await requireAuth(request);
  return auth.workspaceId;
}
