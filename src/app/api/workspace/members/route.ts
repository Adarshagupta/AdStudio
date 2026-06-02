import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, currentUserCan } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendWorkspaceInviteEmail } from "@/lib/email/service";
import {
  allWorkspacePermissions,
  normalizePermissions,
  workspacePermissionKeys,
} from "@/lib/permissions";
import {
  buildInviteUrl,
  createInviteToken,
  getInviteExpiresAt,
  hashInviteToken,
} from "@/lib/team";

const permissionsSchema = z
  .object(
    workspacePermissionKeys.reduce(
      (shape, key) => {
        shape[key] = z.boolean().optional();
        return shape;
      },
      {} as Record<(typeof workspacePermissionKeys)[number], z.ZodOptional<z.ZodBoolean>>,
    ),
  )
  .optional();

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  permissions: permissionsSchema,
});

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageTeam")) {
    return NextResponse.json({ error: "You do not have access to manage this workspace." }, { status: 403 });
  }

  await expireOldInvites(currentUser.workspace.id);

  const [members, invites] = await Promise.all([
    prisma.user.findMany({
      where: {
        workspaceId: currentUser.workspace.id,
        isActive: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
    }),
    prisma.workspaceInvite.findMany({
      where: {
        workspaceId: currentUser.workspace.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
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
    }),
  ]);

  return NextResponse.json({
    members: members.map((member) => ({
      ...member,
      permissions: normalizePermissions(member.permissions, member.role),
    })),
    invites: invites.map((invite) => ({
      ...invite,
      permissions: normalizePermissions(invite.permissions, invite.role),
    })),
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageTeam")) {
    return NextResponse.json({ error: "You do not have access to invite workspace members." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const result = inviteSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const email = result.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser?.isActive && existingUser.workspaceId === currentUser.workspace.id) {
    return NextResponse.json({ error: "This person is already in the workspace." }, { status: 409 });
  }

  if (existingUser && existingUser.workspaceId !== currentUser.workspace.id) {
    return NextResponse.json(
      { error: "That email already belongs to another workspace account." },
      { status: 409 },
    );
  }

  const token = createInviteToken();
  const role = result.data.role;
  const permissions =
    role === "ADMIN" ? allWorkspacePermissions : normalizePermissions(result.data.permissions, role);

  const invite = await prisma.$transaction(async (tx) => {
    await tx.workspaceInvite.updateMany({
      where: {
        workspaceId: currentUser.workspace.id,
        email,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    return tx.workspaceInvite.create({
      data: {
        workspaceId: currentUser.workspace.id,
        invitedById: currentUser.user.id,
        email,
        name: result.data.name || null,
        role,
        permissions,
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

  return NextResponse.json(
    {
      invite: {
        ...invite,
        permissions: normalizePermissions(invite.permissions, invite.role),
        inviteUrl,
      },
      emailError,
    },
    { status: 201 },
  );
}

async function expireOldInvites(workspaceId: string) {
  await prisma.workspaceInvite.updateMany({
    where: {
      workspaceId,
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}
