import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { createSession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { prisma } from "@/lib/db";
import { notifyWorkspaceAdmins } from "@/lib/notifications/service";
import { normalizePermissions } from "@/lib/permissions";
import { hashInviteToken, isInviteUsable } from "@/lib/team";

const acceptInviteSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  password: z.string().min(8).optional(),
});

type RouteContext = {
  params: { token: string };
};

export async function POST(request: Request, context: RouteContext) {
  const body = await parseRequestJson(request);
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

  const permissions = normalizePermissions(invite.permissions, invite.role);
  const currentUser = await getCurrentUser();

  try {
    const userId = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: invite.email },
      });

      const existingMembership = existingUser
        ? await tx.workspaceMember.findUnique({
            where: {
              userId_workspaceId: {
                userId: existingUser.id,
                workspaceId: invite.workspaceId,
              },
            },
          })
        : null;

      if (existingMembership?.isActive) {
        throw new Error("This email is already a member of this workspace.");
      }

      if (existingUser?.isActive) {
        if (currentUser && currentUser.user.email !== invite.email) {
          throw new Error("Sign in with the invited email address to accept this invite.");
        }

        const isSignedInAsInvitee = currentUser?.user.email === invite.email;

        if (!isSignedInAsInvitee) {
          if (!existingUser.passwordHash) {
            throw new Error("This account cannot accept invites yet. Contact support.");
          }

          const password = result.data.password;
          if (!password) {
            throw new Error("Enter your password to join with your existing account.");
          }

          const validPassword = await verifyPassword(password, existingUser.passwordHash);
          if (!validPassword) {
            throw new Error("Invalid password.");
          }
        }

        await tx.workspaceMember.upsert({
          where: {
            userId_workspaceId: {
              userId: existingUser.id,
              workspaceId: invite.workspaceId,
            },
          },
          create: {
            userId: existingUser.id,
            workspaceId: invite.workspaceId,
            role: invite.role,
            permissions,
            isActive: true,
          },
          update: {
            role: invite.role,
            permissions,
            isActive: true,
          },
        });

        if (result.data.name) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: { name: result.data.name, lastWorkspaceId: invite.workspaceId },
          });
        } else {
          await tx.user.update({
            where: { id: existingUser.id },
            data: { lastWorkspaceId: invite.workspaceId },
          });
        }

        await finalizeInvite(tx, invite.id, invite.workspaceId, invite.email);
        return existingUser.id;
      }

      const password = result.data.password;
      const name = result.data.name;

      if (!password || !name) {
        throw new Error("Name and password are required to create your account.");
      }

      const passwordHash = await hashPassword(password);

      const acceptedUser =
        existingUser && !existingUser.isActive
          ? await tx.user.update({
              where: { id: existingUser.id },
              data: {
                name,
                passwordHash,
                isActive: true,
                emailVerifiedAt: new Date(),
                lastWorkspaceId: invite.workspaceId,
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
                name,
                passwordHash,
                emailVerifiedAt: new Date(),
                lastWorkspaceId: invite.workspaceId,
                emailPreference: {
                  create: {},
                },
              },
            });

      await tx.workspaceMember.upsert({
        where: {
          userId_workspaceId: {
            userId: acceptedUser.id,
            workspaceId: invite.workspaceId,
          },
        },
        create: {
          userId: acceptedUser.id,
          workspaceId: invite.workspaceId,
          role: invite.role,
          permissions,
        },
        update: {
          role: invite.role,
          permissions,
          isActive: true,
        },
      });

      await finalizeInvite(tx, invite.id, invite.workspaceId, invite.email);
      return acceptedUser.id;
    });

    await createSession(userId, invite.workspaceId);

    const acceptedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const memberLabel = acceptedUser?.name?.trim() || acceptedUser?.email || invite.email;

    void notifyWorkspaceAdmins(invite.workspaceId, {
      type: "MEMBER_JOINED",
      title: "New team member",
      message: `${memberLabel} joined ${invite.workspace.name}.`,
      href: "/settings/members",
      excludeUserId: userId,
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invite acceptance failed." },
      { status: 409 },
    );
  }
}

async function finalizeInvite(
  tx: Prisma.TransactionClient,
  inviteId: string,
  workspaceId: string,
  email: string,
) {
  await tx.workspaceInvite.update({
    where: { id: inviteId },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  await tx.workspaceInvite.updateMany({
    where: {
      id: { not: inviteId },
      workspaceId,
      email,
      status: "PENDING",
    },
    data: { status: "REVOKED" },
  });
}
