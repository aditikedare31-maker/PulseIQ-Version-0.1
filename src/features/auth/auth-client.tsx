import { APP_ENV } from "@/app/config/env.client";
import { apiUrl } from "@/services/api/api-base";
import { parseMeResponse } from "./map-user";
import type { AuthUser } from "./types";

const ENABLE_AUTH_LOGS = APP_ENV === "development";

function logAuthClient(event: string, data: Record<string, unknown> = {}) {
  if (!ENABLE_AUTH_LOGS) return;
  console.log(`[AUTH_CLIENT] ${event}`, data);
}

class AuthClient {
  private cachedUser: AuthUser | null | undefined = undefined;
  private inflight: Promise<AuthUser | null> | null = null;

  /**
   * Prevents infinite refresh loops when the refresh token is expired,
   * missing, or rejected by the backend.
   */
  private refreshFailedAt: number | null = null;
  private readonly REFRESH_COOLDOWN_MS = 5000;

  private async refreshSession(): Promise<boolean> {
    if (
      this.refreshFailedAt &&
      Date.now() - this.refreshFailedAt < this.REFRESH_COOLDOWN_MS
    ) {
      logAuthClient("refresh_session_cooldown", {
        cooldownRemaining:
          this.REFRESH_COOLDOWN_MS - (Date.now() - this.refreshFailedAt),
      });

      return false;
    }

    try {
      logAuthClient("refresh_session_attempt");

      const refreshResponse = await fetch(apiUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      logAuthClient("refresh_session_result", {
        ok: refreshResponse.ok,
        status: refreshResponse.status,
      });

      if (!refreshResponse.ok) {
        this.refreshFailedAt = Date.now();
        return false;
      }

      this.refreshFailedAt = null;
      return true;
    } catch (error) {
      logAuthClient("refresh_session_error", {
        error: error instanceof Error ? error.message : String(error),
      });

      this.refreshFailedAt = Date.now();
      return false;
    }
  }

  async fetchMe(): Promise<AuthUser | null> {
    if (this.cachedUser !== undefined) {
      logAuthClient("fetch_me_cache_hit", {
        hasUser: Boolean(this.cachedUser),
      });

      return this.cachedUser;
    }

    if (this.inflight) {
      logAuthClient("fetch_me_inflight");
      return this.inflight;
    }

    logAuthClient("fetch_me_start");

    this.inflight = (async () => {
      try {
        const response = await fetch(apiUrl("/auth/me"), {
          credentials: "include",
        });

        logAuthClient("fetch_me_response", {
          status: response.status,
          ok: response.ok,
        });

        if (response.status === 401) {
          logAuthClient("fetch_me_401_attempting_refresh");

          const refreshed = await this.refreshSession();

          if (!refreshed) {
            logAuthClient("fetch_me_refresh_failed");

            /**
             * Cache null because the user is confirmed unauthenticated.
             * This avoids repeated /me + /refresh loops.
             */
            this.cachedUser = null;
            return null;
          }

          logAuthClient("fetch_me_retry_after_refresh");

          const retryResponse = await fetch(apiUrl("/auth/me"), {
            credentials: "include",
          });

          if (!retryResponse.ok) {
            logAuthClient("fetch_me_retry_failed", {
              status: retryResponse.status,
            });

            this.cachedUser = null;
            return null;
          }

          const retryBody = await retryResponse.json().catch(() => null);
          const retryUser = parseMeResponse(retryBody);

          this.cachedUser = retryUser;

          logAuthClient("fetch_me_success_after_refresh", {
            hasUser: Boolean(retryUser),
            userId: retryUser?.id,
          });

          return retryUser;
        }

        if (!response.ok) {
          logAuthClient("fetch_me_not_ok", {
            status: response.status,
          });

          this.cachedUser = null;
          return null;
        }

        const body = await response.json().catch(() => null);
        const user = parseMeResponse(body);

        this.cachedUser = user;

        logAuthClient("fetch_me_success", {
          hasUser: Boolean(user),
          userId: user?.id,
        });

        return user;
      } finally {
        this.inflight = null;
      }
    })();

    return this.inflight;
  }

  async signOut(): Promise<void> {
    logAuthClient("sign_out_start");

    try {
      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      /**
       * Do not block frontend logout if the backend logout request fails.
       * The UI should still clear local auth state.
       */
      logAuthClient("sign_out_request_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.cachedUser = null;
      this.inflight = null;
      this.refreshFailedAt = null;

      logAuthClient("sign_out_complete");
    }
  }

  clearCache(): void {
    logAuthClient("cache_cleared");

    /**
     * undefined means "unknown, fetch again".
     * null means "known unauthenticated".
     */
    this.cachedUser = undefined;
    this.inflight = null;
  }

  /**
   * Future helper if you later want to force logged-out state without calling API.
   * Not used right now, so keep commented.
   */
  // markUnauthenticated(): void {
  //   this.cachedUser = null;
  //   this.inflight = null;
  // }
}

export const authClient = new AuthClient();