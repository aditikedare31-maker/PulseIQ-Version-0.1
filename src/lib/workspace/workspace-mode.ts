/**
 * Workspace Mode Architecture
 *
 * Centralized access resolver for determining workspace data access mode.
 * This is the single source of truth for demo/trial/active data routing.
 */

import type { WorkspaceType, SubscriptionStatus, BillingStatus } from "./types";

/**
 * Workspace data access mode
 *
 * DEMO: User sees realistic demo data (no trial started, no subscription)
 * TRIAL_NO_DATA: Trial user with no imported data (show onboarding)
 * TRIAL_WITH_DATA: Trial user with imported data (show real analytics)
 * ACTIVE: Paid customer with real data
 */
export type WorkspaceMode =
  | "DEMO"
  | "TRIAL_NO_DATA"
  | "TRIAL_WITH_DATA"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED";

/**
 * Workspace billing state for subscription status
 *
 * DEMO: No trial, no subscription
 * TRIAL: Trial period active
 * ACTIVE: Paid subscription active
 * EXPIRED: Trial ended, payment failed, or subscription expired
 * CANCELLED: Subscription cancelled by user
 */
export type SubscriptionState = "DEMO" | "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";

/**
 * Workspace context for mode resolution
 */
export interface WorkspaceContext {
  workspaceType: WorkspaceType;
  billingStatus: BillingStatus;
  subscriptionStatus: SubscriptionStatus;
  onboardingCompleted: boolean;
  trialEndsAt: Date | null;
  hasImportedData: boolean;
}

/**
 * Map Prisma subscription status to subscription state
 */
export function mapSubscriptionStatus(status: SubscriptionStatus): SubscriptionState {
  switch (status) {
    case "DEMO":
      return "DEMO";
    case "TRIALING":
      return "TRIAL";
    case "ACTIVE":
      return "ACTIVE";
    case "PAST_DUE":
    case "SUSPENDED":
      return "EXPIRED";
    case "CANCELED":
      return "CANCELLED";
    default:
      return "DEMO";
  }
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() > trialEndsAt;
}

/**
 * Get subscription state from workspace context
 */
export function getSubscriptionState(ctx: WorkspaceContext): SubscriptionState {
  // If workspace is DEMO type, it's a demo state
  if (ctx.workspaceType === "DEMO") {
    return "DEMO";
  }

  // Map subscription status to state
  const state = mapSubscriptionStatus(ctx.subscriptionStatus);

  // Check if trial has expired
  if (state === "TRIAL" && isTrialExpired(ctx.trialEndsAt)) {
    return "EXPIRED";
  }

  return state;
}

/**
 * Get workspace mode (single source of truth for data routing)
 *
 * This function determines what data source to use:
 * - DEMO: Return demo data providers
 * - TRIAL_NO_DATA: Show onboarding flow
 * - TRIAL_WITH_DATA: Return real data providers
 * - ACTIVE: Return real data providers
 */
export function getWorkspaceMode(ctx: WorkspaceContext): WorkspaceMode {
  const subscriptionState = getSubscriptionState(ctx);

  // Demo users always see demo data
  if (subscriptionState === "DEMO") {
    return "DEMO";
  }

  // Active users always see real data
  if (subscriptionState === "ACTIVE") {
    return "ACTIVE";
  }

  // Expired users should see recovery/billing state, not demo data
  if (subscriptionState === "EXPIRED") {
    return "EXPIRED";
  }

  if (subscriptionState === "CANCELLED") {
    return "CANCELLED";
  }

  // Trial users: check if they have imported data
  if (subscriptionState === "TRIAL") {
    return ctx.hasImportedData ? "TRIAL_WITH_DATA" : "TRIAL_NO_DATA";
  }

  // Fallback to demo
  return "DEMO";
}

/**
 * Check if workspace should show onboarding
 */
export function shouldShowOnboarding(ctx: WorkspaceContext): boolean {
  const mode = getWorkspaceMode(ctx);
  return mode === "TRIAL_NO_DATA" && !ctx.onboardingCompleted;
}

/**
 * Check if workspace should show billing recovery
 */
export function shouldShowBillingRecovery(ctx: WorkspaceContext): boolean {
  const mode = getWorkspaceMode(ctx);
  return mode === "EXPIRED" || mode === "CANCELLED";
}

/**
 * Check if workspace can access real data
 */
export function canAccessRealData(ctx: WorkspaceContext): boolean {
  const mode = getWorkspaceMode(ctx);
  return mode === "TRIAL_WITH_DATA" || mode === "ACTIVE";
}

/**
 * Check if workspace is in demo mode
 */
export function isDemoMode(ctx: WorkspaceContext): boolean {
  return getWorkspaceMode(ctx) === "DEMO";
}

/**
 * Check if workspace is in trial mode
 */
export function isTrialMode(ctx: WorkspaceContext): boolean {
  const mode = getWorkspaceMode(ctx);
  return mode === "TRIAL_NO_DATA" || mode === "TRIAL_WITH_DATA";
}
