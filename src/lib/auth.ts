import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "crypto";
import { revalidateTag, unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { promisify } from "util";

import { prisma } from "@/lib/db";
import { resolveAuthWithBootstrap } from "@/lib/db-bootstrap";
import { databaseSetupErrorMessage, isNeonQuotaExceeded } from "@/lib/prisma-errors";
import { findUserById } from "@/lib/user-db";
import { findWorkspaceById } from "@/lib/workspace-db";
import {
  hasWorkspacePermission,
  type WorkspacePermissionKey,
} from "@/lib/permissions";
import {
  ensureActiveMembership,
  getActiveMembership,
  getDefaultWorkspaceIdForUser,
  mergeUserWithMembership,
  setUserLastWorkspace,
} from "@/lib/workspace-members";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "ugc_session";

function getSessionTokenFromRequest() {
  const cookieToken = cookies().get(SESSION_COOKIE)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const authorization = headers().get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return undefined;
}
const SESSION_DAYS = 30;
const AUTH_CACHE_SECONDS = 45;

function authCacheTag(token: string) {
  return `auth-session-${hashToken(token)}`;
}

function revalidateAuthCache(token: string | undefined) {
  if (token) {
    revalidateTag(authCacheTag(token));
  }
}

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const separator = passwordHash.indexOf(":");
  if (separator < 0) {
    return false;
  }

  const salt = passwordHash.slice(0, separator);
  const storedKey = passwordHash.slice(separator + 1);

  if (!salt || !storedKey) {
    return false;
  }

  const key = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(storedKey, "hex");

  if (key.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(key, stored);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, workspaceId: string): Promise<string> {
  const membership = await getActiveMembership(userId, workspaceId);

  if (!membership) {
    throw new Error("You do not have access to this workspace.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.session.create({
      data: {
        tokenHash: hashToken(token),
        userId,
        workspaceId,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { lastWorkspaceId: workspaceId },
    }),
  ]);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  revalidateAuthCache(token);
  return token;
}

export async function switchWorkspace(userId: string, workspaceId: string) {
  const membership = await getActiveMembership(userId, workspaceId);

  if (!membership) {
    throw new Error("You do not have access to this workspace.");
  }

  const token = cookies().get(SESSION_COOKIE)?.value;

  if (!token) {
    await createSession(userId, workspaceId);
    return;
  }

  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.session.updateMany({
      where: { tokenHash: hashToken(token), userId },
      data: { workspaceId, expiresAt },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { lastWorkspaceId: workspaceId },
    }),
  ]);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  revalidateAuthCache(token);
}

export async function clearSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (token) {
    revalidateAuthCache(token);
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookies().delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const token = getSessionTokenFromRequest();

  if (!token) {
    return null;
  }

  try {
    return await resolveAuthWithBootstrap(() => getCachedCurrentUserForToken(token));
  } catch (error) {
    if (isNeonQuotaExceeded(error)) {
      throw new Error(databaseSetupErrorMessage(error));
    }
    console.error("[auth] getCurrentUser failed:", error);
    return null;
  }
});

async function getCachedCurrentUserForToken(token: string) {
  return unstable_cache(() => loadCurrentUserFromToken(token), [authCacheTag(token)], {
    revalidate: AUTH_CACHE_SECONDS,
    tags: [authCacheTag(token)],
  })();
}

async function loadCurrentUserFromToken(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
      expiresAt: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  const [user, workspace, membership] = await Promise.all([
    findUserById(session.userId),
    findWorkspaceById(session.workspaceId),
    getActiveMembership(session.userId, session.workspaceId),
  ]);

  if (!user?.isActive) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  let activeWorkspace = workspace;

  if (!membership) {
    const fallbackWorkspaceId = await getDefaultWorkspaceIdForUser(session.userId);

    if (!fallbackWorkspaceId) {
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { workspaceId: fallbackWorkspaceId },
    });

    activeWorkspace = await findWorkspaceById(fallbackWorkspaceId);

    if (!activeWorkspace) {
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }
    const fallbackMembership = await ensureActiveMembership(session.userId, fallbackWorkspaceId);

    if (!fallbackMembership) {
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return {
      sessionId: session.id,
      user: mergeUserWithMembership(user, fallbackMembership),
      workspace: activeWorkspace,
      membership: fallbackMembership,
    };
  }

  if (!activeWorkspace) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return {
    sessionId: session.id,
    user: mergeUserWithMembership(user, membership),
    workspace: activeWorkspace,
    membership,
  };
}

export const requireCurrentUser = cache(async (): Promise<CurrentUser> => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return currentUser;
});

/** Use in (shell) pages — layout already enforces login; shares per-request + cross-request auth cache. */
export const getShellUser = requireCurrentUser;

export async function requireCurrentUserWithPermission(
  permission: WorkspacePermissionKey,
): Promise<CurrentUser> {
  const currentUser = await requireCurrentUser();

  if (!hasWorkspacePermission(currentUser.user, permission)) {
    redirect("/dashboard");
  }

  return currentUser;
}

export function currentUserCan(currentUser: CurrentUser, permission: WorkspacePermissionKey) {
  return hasWorkspacePermission(currentUser.user, permission);
}

export function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "User";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export { setUserLastWorkspace };
