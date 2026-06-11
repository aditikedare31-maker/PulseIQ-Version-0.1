/**
 * RBAC hierarchy — single source of truth for API enforcement.
 * `manager` is reserved for a future ops role; `member` remains for backward compatibility.
 */
export const USER_ROLES = ["owner", "admin", "manager", "member", "viewer", "demo"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const ROLE_RANK: Record<UserRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 3,
  viewer: 1,
  demo: 5,
};

const ROLE_ALIASES: Record<string, UserRole> = {
  analyst: "viewer",
};

export function normalizeRole(
  value: string | null | undefined,
  isWorkspaceOwner: boolean,
  options?: { demoWorkspace?: boolean },
): UserRole {
  if (isWorkspaceOwner && !options?.demoWorkspace) return "owner";
  if (options?.demoWorkspace) return "demo";

  const lower = (value ?? "member").toLowerCase();
  const aliased = ROLE_ALIASES[lower] ?? lower;
  if (USER_ROLES.includes(aliased as UserRole)) return aliased as UserRole;
  return "member";
}

export function roleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageWorkspace(role: UserRole): boolean {
  return roleAtLeast(role, "admin");
}

export function canExport(role: UserRole): boolean {
  if (role === "demo") return false;
  return roleAtLeast(role, "member");
}

export function canViewAnalytics(role: UserRole): boolean {
  return roleAtLeast(role, "viewer") || role === "demo";
}
