/** Workspace tier — demo sandbox vs paying/production tenant. */
export type WorkspaceType = "DEMO" | "PRODUCTION";

export type BillingStatus = "inactive" | "active" | "trialing";

/** Lifecycle for trials, autopay, and churn (Stripe/Razorpay wired in a later phase). */
export type SubscriptionStatus =
  | "DEMO"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "SUSPENDED";

export type PaymentProvider = "stripe" | "razorpay";

export type WorkspaceBillingSnapshot = {
  workspaceType: WorkspaceType;
  billingStatus: BillingStatus;
  subscriptionStatus: SubscriptionStatus;
  onboardingCompleted: boolean;
  trialEndsAt: string | null;
};

export function isProductionTier(workspaceType: WorkspaceType): boolean {
  return workspaceType === "PRODUCTION";
}

/** Production features unlocked during trial or paid subscription. */
export function hasProductionSubscription(subscriptionStatus: SubscriptionStatus): boolean {
  return (
    subscriptionStatus === "TRIALING" ||
    subscriptionStatus === "ACTIVE" ||
    subscriptionStatus === "PAST_DUE"
  );
}

/** Sandbox tenant — sample analytics only. */
export function isDemoSandbox(ws: WorkspaceBillingSnapshot): boolean {
  return ws.workspaceType === "DEMO" || ws.subscriptionStatus === "DEMO";
}

export function canUseProductionFeatures(ws: WorkspaceBillingSnapshot): boolean {
  if (!isProductionTier(ws.workspaceType)) return false;
  if (!hasProductionSubscription(ws.subscriptionStatus)) return false;

  // Check trial expiry for TRIALING status
  if (ws.subscriptionStatus === "TRIALING" && ws.trialEndsAt) {
    const trialEndsAt = new Date(ws.trialEndsAt);
    if (new Date() > trialEndsAt) return false;
  }

  return true;
}
