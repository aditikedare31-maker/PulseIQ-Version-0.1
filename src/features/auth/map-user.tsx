import type { AuthUser, OrganizationInfo, WorkspaceInfo } from "./types";

type MeResponseUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string;
  role?: AuthUser["role"];
  avatar?: string | null;
  initials?: string;
  organization?: {
    id: string;
    name: string;
    plan?: OrganizationInfo["plan"];
    outletCount?: number;
  };
  workspace?: {
    id: string;
    name: string;
    plan?: OrganizationInfo["plan"];
    outletCount?: number;
    workspaceType?: "DEMO" | "PRODUCTION";
    billingStatus?: string;
    subscriptionStatus?: string;
    onboardingCompleted?: boolean;
    trialEndsAt?: string | null;
    isDemo?: boolean;
  };
  entitlements?: Record<string, boolean>;
  outletAccess?: number;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = normalizeText(value).toLowerCase();
  return email || null;
}

function normalizePhone(value: string | null | undefined): string | null {
  const phone = normalizeText(value).replace(/\D/g, "");
  return phone || null;
}

function normalizeOrganizationName(value: string | null | undefined): string {
  return normalizeText(value).toUpperCase() || "WORKSPACE";
}

function normalizeBillingStatus(
  value: string | null | undefined,
): WorkspaceInfo["billingStatus"] {
  if (value === "active" || value === "trialing" || value === "inactive") {
    return value;
  }

  return "inactive";
}

export function mapMeUser(raw: MeResponseUser): AuthUser {
  const firstName = normalizeText(raw.firstName) || "User";
  const lastName = normalizeText(raw.lastName);
  const fullName = normalizeText(raw.fullName) || `${firstName} ${lastName}`.trim();

  /**
   * Backend may return either `organization` or `workspace`.
   * Keep this fallback so older and newer API responses both work.
   */
  const org = raw.organization ?? raw.workspace;

  const outletCount = org?.outletCount ?? raw.outletAccess ?? 0;

  const initials =
    normalizeText(raw.initials) ||
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() ||
    "?";

  return {
    id: raw.id,
    firstName,
    lastName,
    fullName,
    email: normalizeEmail(raw.email),
    phone: normalizePhone(raw.phone),
    role: raw.role ?? "owner",
    avatar: raw.avatar ?? null,
    initials,

    organization: {
      id: org?.id ?? "",
      /**
       * Organization/workspace name should stay CAPITAL everywhere in UI state.
       * Backend must still enforce this before saving to DB.
       */
      name: normalizeOrganizationName(org?.name),
      plan: org?.plan ?? (outletCount > 15 ? "growth" : "starter"),
      outletCount,
    },

    workspace: raw.workspace
      ? {
          workspaceType: raw.workspace.workspaceType ?? "DEMO",
          billingStatus: normalizeBillingStatus(raw.workspace.billingStatus),
          subscriptionStatus: raw.workspace.subscriptionStatus ?? "DEMO",
          onboardingCompleted: raw.workspace.onboardingCompleted ?? false,
          trialEndsAt: raw.workspace.trialEndsAt ?? null,
          isDemo: raw.workspace.isDemo ?? raw.workspace.workspaceType === "DEMO",
        }
      : undefined,

    entitlements: raw.entitlements,
    outletAccess: raw.outletAccess ?? outletCount,
  };
}

export function parseMeResponse(body: unknown): AuthUser | null {
  if (!body || typeof body !== "object") return null;

  const record = body as {
    user?: MeResponseUser;
    data?: {
      user?: MeResponseUser;
      workspace?: MeResponseUser["workspace"];
      entitlements?: Record<string, boolean>;
      outletAccess?: number;
    };
  };

  const user = record.user ?? record.data?.user;
  if (!user?.id) return null;

  return mapMeUser({
    ...user,

    /**
     * Supports API shape:
     * {
     *   data: {
     *     user,
     *     workspace,
     *     entitlements,
     *     outletAccess
     *   }
     * }
     */
    workspace: user.workspace ?? record.data?.workspace,
    entitlements: user.entitlements ?? record.data?.entitlements,
    outletAccess: user.outletAccess ?? record.data?.outletAccess,
  });
}