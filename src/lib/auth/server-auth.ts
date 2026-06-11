import "server-only";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { JWT_SECRET } from "@/app/config/env.server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie-config";
import { normalizeRole } from "@/lib/auth/roles";
import type { AuthContext } from "@/lib/auth/auth-context";
import type { Prisma } from "@prisma/client";

type User = Prisma.UserGetPayload<object>;
type Workspace = Prisma.WorkspaceGetPayload<object>;
import { workspaceBillingSnapshot } from "@/lib/workspace/snapshot";
import { isDemoSandbox } from "@/lib/workspace/types";
import { ensureWorkspaceRestaurantIds } from "@/services/tenant/workspace-outlets";
import {
  getCachedAuthContext,
  cacheAuthContext,
  getCachedUserById,
  cacheUserById,
  getCachedWorkspaceOwner,
  cacheWorkspaceOwner,
  getOrBuildAuthContextPromise,
} from "@/lib/request-cache";
import { profileQuery } from "@/lib/query-profiler";
import { createUnauthorizedError } from "./auth-errors";
import { logger } from "@/lib/logger";

async function buildAuthContextInternal(
  userId: string,
  options?: { skipRestaurantIds?: boolean },
): Promise<AuthContext | null> {
  const started = Date.now();
  logger.info("auth", "build_context_internal_start", { userId });
  logger.info("auth", "auth_context_cache_check", { userId });

  const cachedAuth = getCachedAuthContext(userId) as AuthContext | null;
  if (cachedAuth) {
    logger.info("auth", "auth_context_hit", {
      userId,
      duration: Date.now() - started,
      source: "buildAuthContextInternal",
    });
    logger.info("auth", "build_context_return_cached", {
      userId,
      duration: Date.now() - started,
    });
    return cachedAuth;
  }

  logger.info("auth", "auth_context_miss", { userId });

  type UserWithWorkspace = User & {
    workspace: Pick<
      Workspace,
      | "id"
      | "name"
      | "workspaceType"
      | "billingStatus"
      | "subscriptionStatus"
      | "onboardingCompleted"
      | "trialEndsAt"
    >;
  };

  const cachedUser = getCachedUserById(userId) as UserWithWorkspace | null;
  const user =
    cachedUser ||
    (await (async () => {
      logger.info("auth", "db_user_lookup_start", { userId });
      try {
        return await profileQuery(
          `User.findUnique(id=${userId})`,
          () =>
            prisma.user.findUnique({
              where: { id: userId },
              select: {
                id: true,
                role: true,
                workspaceId: true,
                isVerified: true,
                workspace: {
                  select: {
                    id: true,
                    name: true,
                    workspaceType: true,
                    billingStatus: true,
                    subscriptionStatus: true,
                    onboardingCompleted: true,
                    trialEndsAt: true,
                  },
                },
              },
            }),
          100,
        );
      } finally {
        logger.info("auth", "db_user_lookup_end", { userId });
      }
    })());

  if (!cachedUser && user) {
    cacheUserById(userId, user as UserWithWorkspace);
  }

  if (!user || !user.isVerified) {
    // console.log(`[SERVER_AUTH] build_context_failed`, {
    //   userId,
    //   hasUser: !!user,
    //   isVerified: user?.isVerified,
    // });
    return null;
  }

  logger.info("auth", "build_context_start", {
    userId,
    workspaceId: user.workspaceId,
  });

  // Check cache for workspace owner
  const cachedWorkspaceOwner = getCachedWorkspaceOwner(user.workspaceId);
  const workspaceOwner = cachedWorkspaceOwner
    ? { id: cachedWorkspaceOwner }
    : await (async () => {
        logger.info("auth", "db_workspace_lookup_start", {
          workspaceId: user.workspaceId,
        });
        try {
          return await profileQuery(
            `User.findFirst(workspaceId=${user.workspaceId}, owner)`,
            () =>
              prisma.user.findFirst({
                where: { workspaceId: user.workspaceId },
                orderBy: { createdAt: "asc" },
                select: { id: true },
              }),
            100,
          );
        } finally {
          logger.info("auth", "db_workspace_lookup_end", {
            workspaceId: user.workspaceId,
          });
        }
      })();

  // Cache workspace owner if not already cached
  if (!cachedWorkspaceOwner && workspaceOwner) {
    cacheWorkspaceOwner(user.workspaceId, workspaceOwner.id);
  }

  // Get restaurant IDs (already has caching in ensureWorkspaceRestaurantIds)
  // NOTE: This is expensive and should not be called for /api/auth/me
  // Only routes that actually need restaurant IDs should call this
  const restaurantIds = options?.skipRestaurantIds
    ? []
    : await profileQuery(
        `ensureWorkspaceRestaurantIds(${user.workspaceId})`,
        () =>
          ensureWorkspaceRestaurantIds(
            user.workspaceId,
            user.workspace.workspaceType,
            user.workspace.subscriptionStatus,
          ),
        500,
      );

  const billing = workspaceBillingSnapshot(user.workspace);
  const demoWorkspace = isDemoSandbox(billing);
  const role = normalizeRole(user.role, workspaceOwner?.id === user.id, { demoWorkspace });

  const context: AuthContext = {
    userId: user.id,
    workspaceId: user.workspaceId,
    role,
    restaurantIds,
    workspace: billing,
    workspaceOwnerId: workspaceOwner?.id,
  };

  // Cache for this request
  cacheAuthContext(userId, context);
  logger.info("auth", "build_context_complete", {
    userId,
    workspaceId: user.workspaceId,
    outletCount: restaurantIds.length,
    duration: Date.now() - started,
  });
  logger.info("auth", "auth_context_cache_set", {
    userId,
    cacheKey: `auth_context:${userId}`,
  });
  // console.log(`[SERVER_AUTH] build_context_complete`, {
  //   userId,
  //   workspaceId: user.workspaceId,
  //   outletCount: restaurantIds.length,
  //   duration: Date.now() - started,
  // });
  return context;
}

async function buildAuthContext(userId: string): Promise<AuthContext | null> {
  const started = Date.now();
  logger.info("auth", "auth_context_cache_requested", { userId });

  // Check request-level cache first (prevent duplicate queries in same request)
  const cached = getCachedAuthContext(userId) as AuthContext | null;
  if (cached) {
    logger.info("auth", "auth_context_cache_hit", {
      userId,
      duration: Date.now() - started,
    });
    return cached;
  }

  logger.info("auth", "auth_context_cache_miss", { userId });

  // Use promise deduplication to prevent duplicate DB queries for simultaneous requests
  return getOrBuildAuthContextPromise(userId, () => buildAuthContextInternal(userId)) as Promise<AuthContext | null>;
}

export async function getAuthFromRequest(request: NextRequest): Promise<AuthContext | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  // console.log(`[SERVER_AUTH] get_auth_from_request`, {
  //   path: request.nextUrl.pathname,
  //   hasToken: !!token,
  //   cookieName: AUTH_COOKIE_NAME,
  // });
  if (!token) {
    logger.info("auth", "no_auth_token_present", {
      path: request.nextUrl.pathname,
    });
    // console.log(`[SERVER_AUTH] no_auth_token_present`, { path: request.nextUrl.pathname });
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: string };
    // console.log(`[SERVER_AUTH] jwt_verify_success`, {
    //   userId: payload?.userId,
    //   path: request.nextUrl.pathname,
    // });
    if (!payload?.userId) {
      logger.info("auth", "invalid_auth_token_payload", {
        token: Boolean(token),
        path: request.nextUrl.pathname,
      });
      // console.log(`[SERVER_AUTH] invalid_auth_token_payload`, {
      //   path: request.nextUrl.pathname,
      // });
      return null;
    }

    const auth =
      request.nextUrl.pathname === "/api/auth/me"
        ? await buildAuthContextInternal(payload.userId, { skipRestaurantIds: true })
        : await buildAuthContext(payload.userId);
    if (!auth) {
      logger.info("auth", "auth_context_not_found", {
        userId: payload.userId,
      });
      // console.log(`[SERVER_AUTH] auth_context_not_found`, { userId: payload.userId });
      return null;
    }
    // console.log(`[SERVER_AUTH] auth_context_success`, {
    //   userId: payload.userId,
    //   workspaceId: auth.workspaceId,
    //   path: request.nextUrl.pathname,
    // });
    return auth;
  } catch (error) {
    logger.info("auth", "auth_token_verify_failed", {
      error: error instanceof Error ? error.message : String(error),
      path: request.nextUrl.pathname,
    });
    // console.log(`[SERVER_AUTH] auth_token_verify_failed`, {
    //   error: error instanceof Error ? error.message : String(error),
    //   path: request.nextUrl.pathname,
    // });
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const auth = await getAuthFromRequest(request);
  if (!auth) throw createUnauthorizedError();
  return auth;
}
