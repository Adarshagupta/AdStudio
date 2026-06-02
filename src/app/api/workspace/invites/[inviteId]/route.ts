import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendWorkspaceInviteEmail } from "@/lib/email/service";
import { normalizePermissions } from "@/lib/permissions";
import {
  buildInviteUrl,
  createInviteToken,
  getInviteExpiresAt,
  hashInviteToken,
} from "@/lib/team";

type RouteContext = {
  params: { inviteId: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageTeam")) {
    return NextResponse.json({ error: "You do not have access to update invites." }, { status: 403 });
  }

  const invite = await prisma.workspaceInvite.findFirst({
    where: {
      id: context.params.inviteId,
      workspaceId: currentUser.workspace.id,
      status: "PENDING",
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Pending invite not found." }, { status: 404 });
  }

  const token = createInviteToken();
  const updatedInvite = await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: {
      tokenHash: hashInviteToken(token),
      expiresAt: getInviteExpiresAt(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      permissions: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const inviteUrl = buildInviteUrl(new URL(request.url).origin, token);
  let emailError: string | null = null;

  try {
    await sendWorkspaceInviteEmail({
      inviteId: invite.id,
      origin: new URL(request.url).origin,
      token,
    });
  } catch (error) {
    emailError = error instanceof Error ? error.message : "Invite email failed.";
  }

  return NextResponse.json({
    invite: {
      ...updatedInvite,
      permissions: normalizePermissions(updatedInvite.permissions, updatedInvite.role),
      inviteUrl,
    },
    emailError,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageTeam")) {
    return NextResponse.json({ error: "You do not have access to revoke invites." }, { status: 403 });
  }

  const invite = await prisma.workspaceInvite.findFirst({
    where: {
      id: context.params.inviteId,
      workspaceId: currentUser.workspace.id,
      status: "PENDING",
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Pending invite not found." }, { status: 404 });
  }

  await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: { status: "REVOKED" },
  });

  return NextResponse.json({ ok: true });
}
