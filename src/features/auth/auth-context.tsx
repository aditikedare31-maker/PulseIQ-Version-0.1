"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { APP_ENV } from "@/app/config/env.client";
import { authClient } from "./auth-client";
import type { AuthUser } from "./types";

const ENABLE_AUTH_LOGS = APP_ENV === "development";

function logAuthContext(event: string, data: Record<string, unknown> = {}) {
  if (!ENABLE_AUTH_LOGS) return;
  console.log(`[AUTH_CONTEXT] ${event}`, data);
}

/**
 * Public routes where we don't need to check auth on initial load.
 * These pages are accessible to unauthenticated users.
 */
const PUBLIC_ROUTES = new Set([
  "/",
  "/signin",
  "/signup",
  "/verify",
  "/verify-account",
  "/forgot-password",
  "/reset-password",
  "/demo",
  "/pricing",
  "/docs",
  "/contact",
]);

const PUBLIC_PREFIXES = ["/reset-password"];

function isPublicRoute(pathname: string): boolean {
  const path = pathname.split("?")[0]; // Remove query params
  if (PUBLIC_ROUTES.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  /**
   * Re-fetches the current user from /api/auth/me.
   * Use after sign-in, OTP verification, profile update, or workspace update.
   */
  refresh: () => Promise<AuthUser | null>;

  /**
   * Preferred name inside this project.
   */
  signOut: () => Promise<void>;

  /**
   * Alias for compatibility with older components that call logout().
   * Keep this so old files do not break.
   */
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Guard against duplicate auth checks in React Strict Mode or multiple mounts.
   * In development, useEffect runs twice to detect side effects.
   */
  const hasCheckedAuthRef = useRef(false);

  const loadCurrentUser = useCallback(async () => {
    try {
      logAuthContext("fetch_me_start");

      const currentUser = await authClient.fetchMe();

      setUser(currentUser);
      setError(null);

      logAuthContext("fetch_me_success", {
        hasUser: Boolean(currentUser),
        userId: currentUser?.id,
      });

      return currentUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load session";

      logAuthContext("fetch_me_error", { error: message });

      setUser(null);
      setError(message);

      return null;
    }
  }, []);

  useEffect(() => {
    // Prevent duplicate checks due to React Strict Mode or component re-mounting
    if (hasCheckedAuthRef.current) {
      logAuthContext("auth_check_already_done");
      return;
    }

    let mounted = true;

    async function hydrateAuthState() {
      // Skip auth check on public routes to avoid unnecessary API calls
      if (typeof window !== "undefined" && isPublicRoute(window.location.pathname)) {
        logAuthContext("public_route_skip_auth_check", {
          pathname: window.location.pathname,
        });
        
        if (mounted) {
          hasCheckedAuthRef.current = true;
          setLoading(false);
        }
        return;
      }

      logAuthContext("mount_start", { loading: true });

      try {
        const currentUser = await authClient.fetchMe();

        if (!mounted) return;

        setUser(currentUser);
        setError(null);

        logAuthContext("mount_fetch_success", {
          hasUser: Boolean(currentUser),
          userId: currentUser?.id,
        });
      } catch (err) {
        if (!mounted) return;

        const message = err instanceof Error ? err.message : "Failed to load session";

        setUser(null);
        setError(message);

        logAuthContext("mount_fetch_error", { error: message });
      } finally {
        if (mounted) {
          hasCheckedAuthRef.current = true;
          setLoading(false);
        }
      }
    }

    hydrateAuthState();

    return () => {
      mounted = false;
      logAuthContext("unmount");
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      logAuthContext("refresh_start");

      /**
       * Clear cached /me response before fetching fresh auth state.
       * Useful after sign-in, OTP verification, workspace update, or logout/login switch.
       */
      authClient.clearCache?.();

      return await loadCurrentUser();
    } finally {
      setLoading(false);
    }
  }, [loadCurrentUser]);

  const signOut = useCallback(async () => {
    try {
      logAuthContext("sign_out_start", { userId: user?.id });

      await authClient.signOut();

      authClient.clearCache?.();

      setUser(null);
      setError(null);

      logAuthContext("sign_out_complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign out";

      setError(message);

      logAuthContext("sign_out_error", { error: message });

      /**
       * Even if the API logout fails, clear frontend auth state.
       * This prevents the UI from being stuck as authenticated.
       */
      setUser(null);
      authClient.clearCache?.();
    }
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      error,
      refresh,
      signOut,
      logout: signOut,
    }),
    [user, loading, error, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }

  return context;
}