import type { WorkspaceBillingSnapshot } from "@/lib/workspace/types";
import type { UserRole } from "./roles";

export type AuthContext = {
  userId: string;
  workspaceId: string;
  role: UserRole;
  restaurantIds: string[];
  workspace: WorkspaceBillingSnapshot;
  workspaceOwnerId?: string;
};

/**
 * Generic request "carrier" for attaching auth + request metadata.
 *
 * NOTE: This is intentionally framework-agnostic (works for Next.js Route Handlers,
 * server actions, etc.). Do NOT import Express types here.
 */
export type RequestWithAuth = {
  auth?: AuthContext;
  user?: { id: string };
  requestId?: string;
};

export function getAuth(req: { auth?: AuthContext } | undefined | null): AuthContext | undefined {
  return req?.auth;
}
