import type { UserRole } from "./roles";
import { ApiError } from "@/lib/api/errors";

export type Permission =
  | "workspace.manage"
  | "workspace.view"
  | "members.manage"
  | "members.invite"
  | "members.view"
  | "branches.manage"
  | "branches.view"
  | "dashboard.manage"
  | "dashboard.view"
  | "analytics.manage"
  | "analytics.view"
  | "reports.manage"
  | "reports.view"
  | "alerts.manage"
  | "alerts.view"
  | "ai.manage"
  | "ai.view"
  | "settings.manage"
  | "settings.view";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    "workspace.manage",
    "workspace.view",
    "members.manage",
    "members.invite",
    "members.view",
    "branches.manage",
    "branches.view",
    "dashboard.manage",
    "dashboard.view",
    "analytics.manage",
    "analytics.view",
    "reports.manage",
    "reports.view",
    "alerts.manage",
    "alerts.view",
    "ai.manage",
    "ai.view",
    "settings.manage",
    "settings.view",
  ],
  admin: [
    "workspace.view",
    "members.manage",
    "members.invite",
    "members.view",
    "branches.manage",
    "branches.view",
    "dashboard.manage",
    "dashboard.view",
    "analytics.manage",
    "analytics.view",
    "reports.manage",
    "reports.view",
    "alerts.manage",
    "alerts.view",
    "ai.view",
    "settings.view",
  ],
  manager: [
    "workspace.view",
    "members.view",
    "branches.manage",
    "branches.view",
    "dashboard.view",
    "analytics.view",
    "reports.view",
    "alerts.view",
    "ai.view",
  ],
  member: ["workspace.view", "dashboard.view", "analytics.view", "reports.view", "ai.view"],
  viewer: ["workspace.view", "dashboard.view", "analytics.view"],
  demo: [
    "workspace.view",
    "members.view",
    "branches.view",
    "dashboard.view",
    "analytics.view",
    "reports.view",
    "alerts.view",
    "ai.view",
    "settings.view",
  ],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ApiError(403, "You do not have permission to perform this action.", {
      code: "FORBIDDEN",
      details: { permission },
    });
  }
}
