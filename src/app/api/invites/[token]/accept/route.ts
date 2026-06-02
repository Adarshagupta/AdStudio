import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePermissions } from "@/lib/permissions";
import { hashInviteToken, isInviteUsable } from "@/lib/team";

const acceptInviteSchema = z.object({
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8),
});

type RouteContext = {
  params: { token: string };
};

export async function POST(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);
  const result = acceptInviteSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const tokenHash = hashInviteToken(context.params.token);
  const invite = await prisma.workspaceInvite.findUnique({
    where: { tokenHash },
    include: { workspace: true },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (!isInviteUsable(invite)) {
    if (invite.status === "PENDING" && invite.expiresAt <= new Date()) {
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }

    return NextResponse.json({ error: "This invite is no longer active." }, { status: 410 });
  }

  const passwordHash = await hashPassword(result.data.password);
  const permissions = normalizePermissions(invite.permissions, invite.role);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: invite.email },
      });

      if (existingUser?.isActive) {
        throw new Error(
          existingUser.workspaceId === invite.workspaceId
            ? "This email is already a workspace member."
            : "This email already belongs to another workspace account.",
        );
      }

      const acceptedUser =
        existingUser && existingUser.workspaceId === invite.workspaceId
          ? await tx.user.update({
              where: { id: existingUser.id },
              data: {
                name: result.data.name,
                passwordHash,
                role: invite.role,
                permissions,
                isActive: true,
                emailVerifiedAt: new Date(),
                emailPreference: {
                  upsert: {
                    create: {},
                    update: {},
                  },
                },
              },
            })
          : await tx.user.create({
              data: {
                email: invite.email,
                name: result.data.name,
                passwordHash,
                role: invite.role,
                permissions,
                emailVerifiedAt: new Date(),
                workspaceId: invite.workspaceId,
                emailPreference: {
                  create: {},
                },
              },
            });

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      await tx.workspaceInvite.updateMany({
        where: {
          id: { not: invite.id },
          workspaceId: invite.workspaceId,
          email: invite.email,
          status: "PENDING",
        },
        data: { status: "REVOKED" },
      });

      return acceptedUser;
    });

    await createSession(user.id, invite.workspaceId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invite acceptance failed." },
      { status: 409 },
    );
  }
}
