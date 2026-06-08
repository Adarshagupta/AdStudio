import "server-only";

import type { Prisma, Role, User, Workspace } from "@prisma/client";

import { prisma } from "@/lib/db";
import { findUserById } from "@/lib/user-db";
import { findWorkspaceById, isMissingWorkspaceMemberTable } from "@/lib/workspace-db";
import {
  allWorkspacePermissions,
  normalizePermissions,
  type WorkspacePermissions,
  type WorkspaceRole,
} from "@/lib/permissions";

export type ActiveMembership = {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  permissions: unknown;
  isActive: boolean;
  createdAt: Date;
};

function legacyMembership(userId: string, workspaceId: string): ActiveMembership {
  return {
    id: `legacy-${userId}-${workspaceId}`,
    userId,
    workspaceId,
    role: "ADMIN",
    permissions: allWorkspacePermissions,
    isActive: true,
    createdAt: new Date(0),
  };
}

export type WorkspaceMemberWithUser = {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  isActive: boolean;
  createdAt: Date;
  user: Pick<User, "id" | "name" | "email" | "createdAt">;
};

export function mergeUserWithMembership(
  user: User,
  membership: { role: Role; permissions: unknown },
) {
  const role = membership.role as WorkspaceRole;

  return {
    ...user,
    role,
    permissions: normalizePermissions(membership.permissions, role),
  };
}

export async function getActiveMembership(userId: string, workspaceId: string) {
  try {
    return await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
        isActive: true,
      },
    });
  } catch (error) {
    if (isMissingWorkspaceMemberTable(error)) {
      return legacyMembership(userId, workspaceId);
    }
    throw error;
  }
}

/** Creates a membership when the user has a session but no row (e.g. after a partial migration). */
export async function ensureActiveMembership(userId: string, workspaceId: string) {
  const existing = await getActiveMembership(userId, workspaceId);
  if (existing) {
    return existing;
  }

  const [workspace, user] = await Promise.all([
    findWorkspaceById(workspaceId),
    findUserById(userId),
  ]);

  if (!workspace || !user?.isActive) {
    return null;
  }

  try {
    return await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
      create: {
        userId,
        workspaceId,
        role: "ADMIN",
        permissions: allWorkspacePermissions as Prisma.InputJsonValue,
        isActive: true,
      },
      update: {
        isActive: true,
        role: "ADMIN",
      },
    });
  } catch {
    return null;
  }
}

export async function getDefaultWorkspaceIdForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastWorkspaceId: true },
  });

  if (user?.lastWorkspaceId) {
    const preferred = await getActiveMembership(userId, user.lastWorkspaceId);
    if (preferred) {
      return preferred.workspaceId;
    }
  }

  try {
    const first = await prisma.workspaceMember.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    });

    return first?.workspaceId ?? null;
  } catch (error) {
    if (isMissingWorkspaceMemberTable(error)) {
      return user?.lastWorkspaceId ?? null;
    }
    throw error;
  }
}

function slugifyWorkspaceName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createWorkspaceForUser(userId: string, name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Workspace name is required.");
  }

  const baseSlug = slugifyWorkspaceName(trimmed) || "workspace";
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: trimmed,
        slug,
      },
    });

    await tx.workspaceMember.create({
      data: {
        userId,
        workspaceId: workspace.id,
        role: "ADMIN",
        permissions: allWorkspacePermissions as Prisma.InputJsonValue,
      },
    });

    await tx.workspaceOnboarding.create({
      data: { workspaceId: workspace.id },
    });

    return workspace;
  });
}

export async function listWorkspacesForUser(userId: string) {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId, isActive: true },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            creditsRemaining: true,
          },
        },
      },
      orderBy: [{ workspace: { name: "asc" } }],
    });

    return memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      plan: membership.workspace.plan,
      creditsRemaining: membership.workspace.creditsRemaining,
      role: membership.role,
      permissions: normalizePermissions(membership.permissions, membership.role),
    }));
  } catch (error) {
    if (!isMissingWorkspaceMemberTable(error)) {
      throw error;
    }

    const user = await findUserById(userId);

    if (!user?.lastWorkspaceId) {
      return [];
    }

    const workspace = await findWorkspaceById(user.lastWorkspaceId);

    if (!workspace) {
      return [];
    }

    const membership = legacyMembership(userId, workspace.id);

    return [
      {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
        creditsRemaining: workspace.creditsRemaining,
        role: membership.role,
        permissions: normalizePermissions(membership.permissions, membership.role),
      },
    ];
  }
}

export async function addWorkspaceMember(input: {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  permissions?: WorkspacePermissions | Prisma.InputJsonValue;
}) {
  const role = input.role;
  const permissions =
    role === "ADMIN"
      ? allWorkspacePermissions
      : normalizePermissions(input.permissions, role);

  return prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
    },
    create: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      role,
      permissions,
      isActive: true,
    },
    update: {
      role,
      permissions,
      isActive: true,
    },
  });
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberWithUser[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return memberships.map((membership) => ({
    id: membership.id,
    userId: membership.userId,
    workspaceId: membership.workspaceId,
    role: membership.role as WorkspaceRole,
    permissions: normalizePermissions(membership.permissions, membership.role),
    isActive: membership.isActive,
    createdAt: membership.createdAt,
    user: membership.user,
  }));
}

export function toMemberListItem(member: WorkspaceMemberWithUser) {
  return {
    id: member.user.id,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    permissions: member.permissions,
    createdAt: member.user.createdAt.toISOString(),
  };
}

export async function countActiveWorkspaceAdmins(workspaceId: string) {
  return prisma.workspaceMember.count({
    where: {
      workspaceId,
      role: "ADMIN",
      isActive: true,
    },
  });
}

export async function setUserLastWorkspace(userId: string, workspace: Pick<Workspace, "id">) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastWorkspaceId: workspace.id },
  });
}
