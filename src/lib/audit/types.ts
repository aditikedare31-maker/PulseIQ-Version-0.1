export type AuditAction =
  | "auth.signin"
  | "auth.signin_failed"
  | "auth.signout"
  | "auth.signup"
  | "auth.signup_failed"
  | "auth.verify_otp"
  | "auth.verify_otp_failed"
  | "auth.resend_otp"
  | "auth.refresh"
  | "auth.password_reset_request"
  | "workspace.update"
  | "workspace.outlet_access"
  | "export.generate"
  | "analytics.query"
  | "ai.query"
  | "billing.trial_checkout_created"
  | "billing.subscription_cancelled"
  | "billing.transition"
  | "billing.webhook_processed";

export type AuditOutcome = "success" | "failure" | "denied";

export type AuditLogInput = {
  action: AuditAction;
  outcome?: AuditOutcome;
  userId?: string | null;
  workspaceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  resource?: string | null;
  requestId?: string | null;
  meta?: Record<string, unknown>;
};
