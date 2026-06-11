import type { AuthContext } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/errors";
import {
  canExport,
  canManageWorkspace,
  canViewAnalytics,
  roleAtLeast,
  type UserRole,
} from "@/lib/auth/roles";
// TODO: Create entitlements module
import {
  entitlementDeniedMessage,
  hasEntitlement,
  type EntitlementFeature,
} from "@/lib/entitlements";

export function requireRole(auth: AuthContext, ...allowed: UserRole[]) {
  if (!allowed.some((role) => roleAtLeast(auth.role, role))) {
    throw new ApiError(403, "You do not have permission to perform this action.", {
      code: "FORBIDDEN",
    });
  }
}

export function requireAnalyticsAccess(auth: AuthContext) {
  if (!canViewAnalytics(auth.role)) {
    throw new ApiError(403, "You do not have permission to perform this action.", {
      code: "FORBIDDEN",
    });
  }
}

export function requireExportAccess(auth: AuthContext) {
  if (!canExport(auth.role)) {
    throw new ApiError(403, "You do not have permission to perform this action.", {
      code: "FORBIDDEN",
    });
  }
}

export function requireWorkspaceAdmin(auth: AuthContext) {
  if (!canManageWorkspace(auth.role)) {
    throw new ApiError(403, "You do not have permission to perform this action.", {
      code: "FORBIDDEN",
    });
  }
}

export function requireEntitlement(auth: AuthContext, ...features: EntitlementFeature[]) {
  const denied = features.find((feature) => !hasEntitlement(auth.workspace, feature));
  if (denied) {
    throw new ApiError(403, entitlementDeniedMessage(auth.workspace, denied), {
      code: "ENTITLEMENT_DENIED",
      details: {
        feature: denied,
        workspaceType: auth.workspace.workspaceType,
        subscriptionStatus: auth.workspace.subscriptionStatus,
      },
    });
  }
}
