import type { Prisma, SubscriptionStatus } from "@prisma/client";
import type { WorkspaceBillingSnapshot } from "@/lib/workspace/types";

type WorkspaceModel = Prisma.WorkspaceGetPayload<object>;

export type AccountState = "VISITOR" | "DEMO" | "TRIAL" | "EXPIRED_TRIAL" | "CUSTOMER";

export interface AccountInfo {
  state: AccountState;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  plan: string | null;
}

/**
 * Determine the account state based on user and workspace/subscription data.
 *
 * Rules:
 * - no user = VISITOR
 * - subscriptionStatus === "ACTIVE" = CUSTOMER
 * - subscriptionStatus === "TRIALING" and trialEndsAt >= now = TRIAL
 * - subscriptionStatus === "TRIALING" and trialEndsAt < now = EXPIRED_TRIAL
 * - no subscription / demo status = DEMO
 */
export function getAccountState(
  user: { id: string } | null,
  workspace: WorkspaceModel | WorkspaceBillingSnapshot | null,
): AccountState {
  const userId = user?.id;
  const subscriptionStatus = workspace?.subscriptionStatus;
  const trialEndsAt = workspace?.trialEndsAt;
  const now = new Date();

  let result: AccountState;
  let reason: string;

  // No user = VISITOR
  if (!user) {
    result = "VISITOR";
    reason = "no_user";
    // console.log("[ACCOUNT_STATE_DECISION]", {
    //   userId,
    //   subscriptionStatus,
    //   trialEndsAt,
    //   now,
    //   result,
    //   reason,
    // });
    return result;
  }

  // No workspace = DEMO (should not happen in normal flow, but handle defensively)
  if (!workspace) {
    result = "DEMO";
    reason = "no_workspace";
    // console.log("[ACCOUNT_STATE_DECISION]", {
    //   userId,
    //   subscriptionStatus,
    //   trialEndsAt,
    //   now,
    //   result,
    //   reason,
    // });
    return result;
  }

  // Null or undefined subscriptionStatus = DEMO (new users or data inconsistency)
  if (!subscriptionStatus) {
    result = "DEMO";
    reason = "null_subscription_status";
    // console.log("[ACCOUNT_STATE_DECISION]", {
    //   userId,
    //   subscriptionStatus,
    //   trialEndsAt,
    //   now,
    //   result,
    //   reason,
    // });
    return result;
  }

  // ACTIVE subscription = CUSTOMER
  if (subscriptionStatus === "ACTIVE") {
    result = "CUSTOMER";
    reason = "active_subscription";
    // console.log("[ACCOUNT_STATE_DECISION]", {
    //   userId,
    //   subscriptionStatus,
    //   trialEndsAt,
    //   now,
    //   result,
    //   reason,
    // });
    return result;
  }

  // TRIALING with valid trial = TRIAL
  if (subscriptionStatus === "TRIALING") {
    if (!trialEndsAt) {
      // TRIALING without trialEndsAt (data inconsistency) = treat as TRIAL with warning
      result = "TRIAL";
      reason = "trialing_without_trial_ends_at_treated_as_trial";
      console.warn("[ACCOUNT_STATE_DECISION] TRIALING without trialEndsAt, treating as TRIAL", {
        userId,
        subscriptionStatus,
        trialEndsAt,
        now,
        result,
        reason,
      });
      return result;
    }

    const trialEndsAtDate = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
    if (trialEndsAtDate >= now) {
      result = "TRIAL";
      reason = "trialing_with_valid_trial_ends_at";
      // console.log("[ACCOUNT_STATE_DECISION]", {
      //   userId,
      //   subscriptionStatus,
      //   trialEndsAt,
      //   now,
      //   result,
      //   reason,
      // });
      return result;
    }

    // TRIALING but expired = EXPIRED_TRIAL
    result = "EXPIRED_TRIAL";
    reason = "trialing_with_expired_trial_ends_at";
    // console.log("[ACCOUNT_STATE_DECISION]", {
    //   userId,
    //   subscriptionStatus,
    //   trialEndsAt,
    //   now,
    //   result,
    //   reason,
    // });
    return result;
  }

  // DEMO or any other status = DEMO
  result = "DEMO";
  reason = `subscription_status_${subscriptionStatus}`;
  // console.log("[ACCOUNT_STATE_DECISION]", {
  //   userId,
  //   subscriptionStatus,
  //   trialEndsAt,
  //   now,
  //   result,
  //   reason,
  // });
  return result;
}

/**
 * Get detailed account information including state and subscription details.
 */
export function getAccountInfo(
  user: { id: string } | null,
  workspace: WorkspaceModel | WorkspaceBillingSnapshot | null,
): AccountInfo {
  const state = getAccountState(user, workspace);

  // Handle trialEndsAt conversion from WorkspaceBillingSnapshot (string) to Date
  let trialEndsAt: Date | null = null;
  if (workspace?.trialEndsAt) {
    trialEndsAt =
      typeof workspace.trialEndsAt === "string"
        ? new Date(workspace.trialEndsAt)
        : workspace.trialEndsAt;
  }

  return {
    state,
    subscriptionStatus: workspace?.subscriptionStatus ?? "DEMO",
    trialEndsAt,
    plan: workspace?.subscriptionStatus === "ACTIVE" ? "PRO" : null,
  };
}

/**
 * Check if the account state can access the main app.
 */
export function canAccessApp(state: AccountState): boolean {
  return state !== "VISITOR";
}

/**
 * Check if the account state can access billing.
 */
export function canAccessBilling(state: AccountState): boolean {
  return state !== "VISITOR";
}

/**
 * Check if the account state can use demo data.
 * Only demo accounts should use demo data; trial/customer accounts should import real data or see an empty state.
 */
export function canUseDemoData(state: AccountState): boolean {
  return state === "DEMO";
}

/**
 * Check if the account state can use real data.
 */
export function canUseRealData(state: AccountState): boolean {
  return state === "TRIAL" || state === "CUSTOMER";
}

/**
 * Check if the account state should show an upgrade CTA.
 */
export function shouldShowUpgradeCTA(state: AccountState): boolean {
  return state === "DEMO" || state === "TRIAL" || state === "EXPIRED_TRIAL";
}

/**
 * Check if the account state should require data import.
 * Trial and customer accounts without imported data should be required to import real data.
 */
export function shouldRequireImport(state: AccountState, hasImportedData: boolean): boolean {
  return (state === "TRIAL" || state === "CUSTOMER") && !hasImportedData;
}
