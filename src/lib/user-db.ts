import "server-only";

import type { User } from "@prisma/client";

import { prisma } from "@/lib/db";
import { isPrismaError } from "@/lib/prisma-errors";

function isPrismaSchemaMismatch(error: unknown) {
  if (isPrismaError(error) && ["P2021", "P2022"].includes(error.code)) {
    return true;
  }

  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("Invalid `prisma") ||
    message.includes("lastWorkspaceId") ||
    message.includes("workspaceId") ||
    message.includes("WorkspaceMember") ||
    message.includes("does not exist in the current database")
  );
}

type LegacyUserRow = {
  id: string;
  clerkId: string | null;
  email: string;
  name: string | null;
  passwordHash: string | null;
  workspaceId: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

/** Loads a user when Prisma cannot read `lastWorkspaceId` on a pre-migration database. */
export async function findUserById(id: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({ where: { id } });
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) {
      throw error;
    }
  }

  try {
    const legacyRows = await prisma.$queryRaw<LegacyUserRow[]>`
      SELECT
        id,
        "clerkId",
        email,
        name,
        "passwordHash",
        "workspaceId",
        "isActive",
        "emailVerifiedAt",
        "createdAt"
      FROM "User"
      WHERE id = ${id}
      LIMIT 1
    `;

    const row = legacyRows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      clerkId: row.clerkId,
      email: row.email,
      name: row.name,
      passwordHash: row.passwordHash,
      lastWorkspaceId: row.workspaceId,
      isActive: row.isActive,
      emailVerifiedAt: row.emailVerifiedAt,
      createdAt: row.createdAt,
    };
  } catch {
    const rows = await prisma.$queryRaw<User[]>`
      SELECT
        id,
        "clerkId",
        email,
        name,
        "passwordHash",
        "lastWorkspaceId",
        "isActive",
        "emailVerifiedAt",
        "createdAt"
      FROM "User"
      WHERE id = ${id}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  try {
    return await prisma.user.findFirst({
      where: {
        email: { equals: normalized, mode: "insensitive" },
      },
    });
  } catch (error) {
    if (!isPrismaSchemaMismatch(error)) {
      throw error;
    }
  }

  const rows = await prisma.$queryRaw<LegacyUserRow[]>`
    SELECT
      id,
      "clerkId",
      email,
      name,
      "passwordHash",
      "workspaceId",
      "isActive",
      "emailVerifiedAt",
      "createdAt"
    FROM "User"
    WHERE LOWER(email) = ${normalized}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    clerkId: row.clerkId,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    lastWorkspaceId: row.workspaceId,
    isActive: row.isActive,
    emailVerifiedAt: row.emailVerifiedAt,
    createdAt: row.createdAt,
  };
}

export { isPrismaSchemaMismatch };
