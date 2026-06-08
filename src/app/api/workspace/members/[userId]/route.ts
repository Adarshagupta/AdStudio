import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { prisma } from "@/lib/db";
import {
  allWorkspacePermissions,
  normalizePermissions,
  workspacePermissionKeys,
} from "@/lib/permissions";
import { countActiveWorkspaceAdmins, toMemberListItem } from "@/lib/workspace-members";

const permissionsSchema = z.object(
  workspacePermissionKeys.reduce(
    (shape, key) => {
      shape[key] = z.boolean().optional();
      return shape;
    },
    {} as Record<(typeof workspacePermissionKeys)[number], z.ZodOptional<z.ZodBoolean>>,
  ),
);

const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
  permissions: permissionsSchema.optional(),
});

type RouteContext = {
  params: { userId: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageTeam")) {
    return NextResponse.json({ error: "You do not have access to edit workspace members." }, { status: 403 });
  }

  if (context.params.userId === currentUser.user.id) {
    return NextResponse.json({ error: "You cannot change your own access." }, { status: 400 });
  }

  const body = await parseRequestJson(request);
  const result = updateMemberSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId: context.params.userId,
      workspaceId: currentUser.workspace.id,
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
  });

  if (!member) {
    return NextResponse.json({ error: "Workspace member not found." }, { status: 404 });
  }

  if (member.role === "ADMIN" && result.data.role !== "ADMIN") {
    const adminCount = await countActiveWorkspaceAdmins(currentUser.workspace.id);

    if (adminCount <= 1) {
      return NextResponse.json({ error: "Keep at least one active admin in the workspace." }, { status: 400 });
    }
  }

  const permissions =
    result.data.role === "ADMIN"
      ? allWorkspacePermissions
      : normalizePermissions(result.data.permissions, result.data.role);

  const updatedMember = await prisma.workspaceMember.update({
    where: { id: member.id },
    data: {
      role: result.data.role,
      permissions,
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
  });

  return NextResponse.json({
    member: toMemberListItem({
      id: updatedMember.id,
      userId: updatedMember.userId,
      workspaceId: updatedMember.workspaceId,
      role: updatedMember.role,
      permissions: normalizePermissions(updatedMember.permissions, updatedMember.role),
      isActive: updatedMember.isActive,
      createdAt: updatedMember.createdAt,
      user: updatedMember.user,
    }),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageTeam")) {
    return NextResponse.json({ error: "You do not have access to remove workspace members." }, { status: 403 });
  }

  if (context.params.userId === currentUser.user.id) {
    return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 });
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId: context.params.userId,
      workspaceId: currentUser.workspace.id,
      isActive: true,
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Workspace member not found." }, { status: 404 });
  }

  if (member.role === "ADMIN") {
    const adminCount = await countActiveWorkspaceAdmins(currentUser.workspace.id);

    if (adminCount <= 1) {
      return NextResponse.json({ error: "Keep at least one active admin in the workspace." }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.session.deleteMany({
      where: {
        userId: member.userId,
        workspaceId: currentUser.workspace.id,
      },
    }),
    prisma.workspaceMember.update({
      where: { id: member.id },
      data: { isActive: false },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
