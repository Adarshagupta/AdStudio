import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendWorkspaceInviteEmail } from "@/lib/email/service";
import { parseRequestJson } from "@/lib/http/json";
import { getRequestOrigin } from "@/lib/integrations/app-url";
import { accessPresets, memberDefaultPermissions, normalizePermissions } from "@/lib/permissions";
import {
  buildInviteUrl,
  createInviteToken,
  getInviteExpiresAt,
  hashInviteToken,
} from "@/lib/team";

const inviteRowSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  preset: z.enum(["creator", "viewer", "analyst"]).default("creator"),
});

const bodySchema = z.object({
  invites: z.array(inviteRowSchema).max(20),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseRequestJson(request);
  const result = bodySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid invite list." }, { status: 400 });
  }

  if (result.data.invites.length === 0) {
    return NextResponse.json({ sent: [], skipped: [] });
  }

  const origin = getRequestOrigin(request);
  const sent: { email: string; inviteUrl?: string; emailError?: string | null }[] = [];
  const skipped: { email: string; reason: string }[] = [];

  for (const row of result.data.invites) {
    const email = row.email;

    const existingMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: currentUser.workspace.id,
        isActive: true,
        user: { email },
      },
    });

    if (existingMembership) {
      skipped.push({ email, reason: "already_member" });
      continue;
    }

    const token = createInviteToken();
    const role = "MEMBER" as const;
    const preset = accessPresets.find((item) => item.id === row.preset);
    const permissions = normalizePermissions(
      preset?.permissions ?? memberDefaultPermissions,
      role,
    );

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
          role,
          permissions,
          tokenHash: hashInviteToken(token),
          expiresAt: getInviteExpiresAt(),
        },
      });
    });

    const inviteUrl = buildInviteUrl(origin, token);
    let emailError: string | null = null;

    try {
      await sendWorkspaceInviteEmail({
        inviteId: invite.id,
        origin,
        token,
      });
    } catch (error) {
      emailError = error instanceof Error ? error.message : "Invite email failed.";
    }

    sent.push({ email, inviteUrl, emailError });
  }

  return NextResponse.json({ sent, skipped });
}
