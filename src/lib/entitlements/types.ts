export const ENTITLEMENT_FEATURES = [
  "analytics",
  "dashboard",
  "ai_insights",
  "export",
  "integrations",
  "workspace_settings",
  "team_view",
  "team_invite",
  "billing",
  "api_keys",
] as const;

export type EntitlementFeature = (typeof ENTITLEMENT_FEATURES)[number];

export type EntitlementMap = Record<EntitlementFeature, boolean>;
