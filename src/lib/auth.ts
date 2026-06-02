import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { promisify } from "util";

import { prisma } from "@/lib/db";
import {
  hasWorkspacePermission,
  type WorkspacePermissionKey,
} from "@/lib/permissions";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "ugc_session";
const SESSION_DAYS = 30;

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedKey] = passwordHash.split(":");

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

export async function createSession(userId: string, workspaceId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      workspaceId,
      expiresAt,
    },
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: true,
      workspace: true,
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    cookies().delete(SESSION_COOKIE);
    return null;
  }

  return {
    sessionId: session.id,
    user: session.user,
    workspace: session.workspace,
  };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return currentUser;
}

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
