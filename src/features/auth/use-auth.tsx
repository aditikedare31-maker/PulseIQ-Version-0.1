import { useAuthContext } from "./auth-context";

export function useAuth() {
  return useAuthContext();
}

export type { AuthUser, OrganizationInfo } from "./types";
export { userFirstName, userInitials } from "./types";
