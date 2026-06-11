export type OrganizationInfo = {
  id: string;

  /**
   * Organization/workspace display name.
   * Backend should store and return this in CAPITAL letters.
   *
   * Example:
   * "SPICE ROUTE CO."
   */
  name: string;

  plan: "starter" | "growth" | "enterprise";
  outletCount: number;
};

export type WorkspaceInfo = {
  workspaceType: "DEMO" | "PRODUCTION";
  billingStatus: "inactive" | "active" | "trialing";
  subscriptionStatus: string;
  onboardingCompleted: boolean;
  trialEndsAt: string | null;
  isDemo: boolean;
};

export type AuthRole =
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "viewer"
  | "demo"
  | "analyst";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;

  /**
   * Keep both email and phone.
   * Sign-in should allow either email OR phone.
   */
  email: string | null;
  phone: string | null;

  role: AuthRole;
  avatar: string | null;
  initials: string;

  organization: OrganizationInfo;
  workspace?: WorkspaceInfo;

  entitlements?: Record<string, boolean>;
  outletAccess: number;
};

export function userFirstName(user: AuthUser | null | undefined): string {
  if (!user) return "there";

  const firstName = user.firstName?.trim();
  if (firstName) return firstName;

  const fullNameFirstPart = user.fullName?.trim().split(" ")[0];
  return fullNameFirstPart || "there";
}

export function userInitials(user: AuthUser | null | undefined): string {
  if (!user) return "?";

  const initials = user.initials?.trim();
  if (initials) return initials;

  const firstInitial = user.firstName?.trim()?.[0] ?? "";
  const lastInitial = user.lastName?.trim()?.[0] ?? "";

  return `${firstInitial}${lastInitial}`.toUpperCase() || "?";
}