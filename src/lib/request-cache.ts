import { AsyncLocalStorage } from "async_hooks";
import { logger } from "./logger";

/**
 * Request-level cache for preventing duplicate database queries
 * within the same request lifecycle using AsyncLocalStorage
 */

interface RequestCacheStore {
  userById: Map<string, Record<string, unknown>>;
  workspaceById: Map<string, Record<string, unknown>>;
  workspaceOutlets: Map<string, Record<string, unknown>[]>;
  workspaceOwnerById: Map<string, string>;
  authContext: Map<string, unknown>;
}

const requestCacheStorage = new AsyncLocalStorage<RequestCacheStore>();

// Promise deduplication cache (for simultaneous requests)
const inFlightAuthContextPromises = new Map<string, Promise<unknown>>();

// Simple module-level auth context cache to avoid repeated DB lookups
// across separate requests. Entries expire after GLOBAL_AUTH_TTL_MS.
const GLOBAL_AUTH_TTL_MS = 60 * 1000; // 60 seconds
const globalAuthContextCache = new Map<
  string,
  { value: unknown; expiresAt: number }
>();

export function getOrBuildAuthContextPromise(
  userId: string,
  builder: () => Promise<unknown>,
): Promise<unknown> {
  // Check if there's already an in-flight promise for this user
  const existingPromise = inFlightAuthContextPromises.get(userId);
  if (existingPromise) {
    logger.info("cache", "auth_context_promise_reused", { userId });
    return existingPromise;
  }

  // Create new promise and cache it
  const promise = builder().finally(() => {
    // Remove from in-flight cache when complete
    inFlightAuthContextPromises.delete(userId);
  });

  inFlightAuthContextPromises.set(userId, promise);
  logger.info("cache", "auth_context_promise_created", { userId });
  return promise;
}

export function getRequestCache(): RequestCacheStore {
  let store = requestCacheStorage.getStore();
  if (!store) {
    store = {
      userById: new Map(),
      workspaceById: new Map(),
      workspaceOutlets: new Map(),
      workspaceOwnerById: new Map(),
      authContext: new Map(),
    };
    requestCacheStorage.enterWith(store);
  }
  return store;
}

export async function withRequestCache<T>(fn: () => Promise<T>): Promise<T> {
  const store: RequestCacheStore = {
    userById: new Map(),
    workspaceById: new Map(),
    workspaceOutlets: new Map(),
    workspaceOwnerById: new Map(),
    authContext: new Map(),
  };
  return requestCacheStorage.run(store, fn);
}

export function cacheUserById(userId: string, user: Record<string, unknown>): void {
  const cache = getRequestCache();
  cache.userById.set(userId, user);
}

export function getCachedUserById(userId: string): Record<string, unknown> | null {
  const cache = getRequestCache();
  const hit = cache.userById.get(userId);
  if (hit) {
    logger.info("cache", "user_hit", { userId });
  }
  return hit ?? null;
}

export function cacheWorkspaceById(workspaceId: string, workspace: Record<string, unknown>): void {
  const cache = getRequestCache();
  cache.workspaceById.set(workspaceId, workspace);
}

export function getCachedWorkspaceById(workspaceId: string): Record<string, unknown> | null {
  const cache = getRequestCache();
  const hit = cache.workspaceById.get(workspaceId);
  if (hit) {
    logger.info("cache", "workspace_hit", { workspaceId });
  }
  return hit ?? null;
}

export function cacheWorkspaceOutlets(
  workspaceId: string,
  outlets: Record<string, unknown>[],
): void {
  const cache = getRequestCache();
  cache.workspaceOutlets.set(workspaceId, outlets);
}

export function getCachedWorkspaceOutlets(workspaceId: string): Record<string, unknown>[] | null {
  const cache = getRequestCache();
  const hit = cache.workspaceOutlets.get(workspaceId);
  if (hit) {
    logger.info("cache", "workspace_outlets_hit", { workspaceId, count: hit.length });
  }
  return hit ?? null;
}

/**
 * Cache workspace owner lookup results in request-local storage to avoid
 * duplicate queries within the same request. Maps workspaceId -> owner user ID.
 */
export function cacheWorkspaceOwner(workspaceId: string, ownerId: string): void {
  const cache = getRequestCache();
  cache.workspaceOwnerById.set(workspaceId, ownerId);
}

export function getCachedWorkspaceOwner(workspaceId: string): string | null {
  const cache = getRequestCache();
  const hit = cache.workspaceOwnerById.get(workspaceId);
  if (hit) {
    logger.info("cache", "workspace_owner_hit", { workspaceId });
  }
  return hit ?? null;
}

const AUTH_CONTEXT_CACHE_PREFIX = "auth_context:";

function getAuthContextCacheKey(userId: string): string {
  return `${AUTH_CONTEXT_CACHE_PREFIX}${userId}`;
}

export function getCachedAuthContext(userId: string): unknown | null {
  const now = Date.now();

  // Check global cache first
  const globalEntry = globalAuthContextCache.get(userId);
  if (globalEntry && globalEntry.expiresAt > now) {
    logger.info("cache", "auth_context_hit_global", { userId });
    return globalEntry.value;
  }

  // Fallback to request-local cache
  const cache = getRequestCache();
  const key = getAuthContextCacheKey(userId);
  const hit = cache.authContext.get(key);

  if (hit) {
    logger.info("cache", "auth_context_hit", { userId, cacheKey: key });
  }

  return hit ?? null;
}

export function cacheAuthContext(userId: string, context: unknown): void {
  const cache = getRequestCache();
  const key = getAuthContextCacheKey(userId);
  cache.authContext.set(key, context);

  // Store in global cache with expiry
  globalAuthContextCache.set(userId, { value: context, expiresAt: Date.now() + GLOBAL_AUTH_TTL_MS });
}

/**
 * Clear all caches for a new request
 */
export function clearRequestCache(): void {
  const cache = getRequestCache();
  cache.userById.clear();
  cache.workspaceById.clear();
  cache.workspaceOutlets.clear();
  cache.workspaceOwnerById.clear();
  cache.authContext.clear();
}
