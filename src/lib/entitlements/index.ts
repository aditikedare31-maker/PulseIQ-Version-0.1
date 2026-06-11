import type { WorkspaceBillingSnapshot } from "@/lib/workspace/types";
import { canUseProductionFeatures, isDemoSandbox } from "@/lib/workspace/types";
import type { EntitlementFeature, EntitlementMap } from "./types";

export type { EntitlementFeature, EntitlementMap };
export { ENTITLEMENT_FEATURES } from "./types";

const DEMO_DENIED: EntitlementFeature[] = [
  "export",
  "integrations",
  "workspace_settings",
  "team_view",
  "team_invite",
  "billing",
  "api_keys",
];

/** Past-due grace: analytics stay on; sensitive actions restricted. */
function isPastDueGrace(ws: WorkspaceBillingSnapshot): boolean {
  return ws.subscriptionStatus === "PAST_DUE";
}

/** Central gate — derived from workspaceType, subscriptionStatus, and role (via snapshot). */
export function resolveEntitlements(ws: WorkspaceBillingSnapshot): EntitlementMap {
  const sandbox = isDemoSandbox(ws);
  const production = canUseProductionFeatures(ws);
  const pastDue = isPastDueGrace(ws);

  const base: EntitlementMap = {
    analytics: true,
    dashboard: true,
    ai_insights: true,
    export: production && !pastDue,
    integrations: production && !pastDue,
    workspace_settings: production,
    team_view: true,
    team_invite: production && !pastDue,
    billing: production,
    api_keys: production && !pastDue,
  };

  if (!sandbox) return base;

  for (const feature of DEMO_DENIED) {
    base[feature] = false;
  }

  return base;
}

export function hasEntitlement(ws: WorkspaceBillingSnapshot, feature: EntitlementFeature): boolean {
  return resolveEntitlements(ws)[feature];
}

export function entitlementDeniedMessage(
  ws: WorkspaceBillingSnapshot,
  feature: EntitlementFeature,
): string {
  const labels: Record<EntitlementFeature, string> = {
    analytics: "analytics",
    dashboard: "the dashboard",
    ai_insights: "AI insights",
    export: "exports",
    integrations: "integrations",
    workspace_settings: "workspace settings",
    team_view: "team",
    team_invite: "team invitations",
    billing: "billing",
    api_keys: "API keys",
  };

  if (isDemoSandbox(ws)) {
    return `Demo workspaces cannot access ${labels[feature]}. Start a free trial to unlock production features.`;
  }

  if (isPastDueGrace(ws)) {
    return `Your subscription is past due. Update billing to access ${labels[feature]}.`;
  }

  return `Your workspace cannot access ${labels[feature]}.`;
}

/** Demo AI cap is enforced separately via rate limiter profile. */
export function aiRateLimitProfile(ws: WorkspaceBillingSnapshot): "demo" | "standard" {
  return isDemoSandbox(ws) ? "demo" : "standard";
}
