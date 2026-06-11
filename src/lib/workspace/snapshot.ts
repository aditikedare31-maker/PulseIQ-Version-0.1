import type { WorkspaceBillingSnapshot } from "./types";

type WorkspaceForBillingSnapshot = {
  workspaceType: WorkspaceBillingSnapshot["workspaceType"];
  billingStatus: WorkspaceBillingSnapshot["billingStatus"];
  subscriptionStatus: WorkspaceBillingSnapshot["subscriptionStatus"];
  onboardingCompleted: boolean;
  trialEndsAt: Date | string | null;
};

export function workspaceBillingSnapshot(
  workspace: WorkspaceForBillingSnapshot,
): WorkspaceBillingSnapshot {
  const trialEndsAt =
    workspace.trialEndsAt instanceof Date
      ? workspace.trialEndsAt.toISOString()
      : workspace.trialEndsAt;

  return {
    workspaceType: workspace.workspaceType,
    billingStatus: workspace.billingStatus,
    subscriptionStatus: workspace.subscriptionStatus,
    onboardingCompleted: workspace.onboardingCompleted,
    trialEndsAt: trialEndsAt ?? null,
  };
}
