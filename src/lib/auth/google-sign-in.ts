import "server-only";

import { prisma } from "@/lib/db";
import { attachReferralOnUserCreate } from "@/lib/referral/program";
import { allWorkspacePermissions } from "@/lib/permissions";
import { getDefaultWorkspaceIdForUser } from "@/lib/workspace-members";
import type { GoogleProfile } from "@/lib/auth/google-oauth";
import type { GoogleOAuthIntent } from "@/lib/auth/google-oauth-state";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function defaultWorkspaceName(profile: GoogleProfile) {
  const base = profile.name?.trim() || profile.email.split("@")[0] || "My";
  return `${base}'s workspace`;
}

export async function resolveGoogleAuthUser(
  profile: GoogleProfile,
  _intent: GoogleOAuthIntent,
  referralCode?: string | null,
) {
  if (!profile.emailVerified) {
    throw new Error("Your Google email is not verified. Verify it with Google and try again.");
  }

  const byGoogleId = await prisma.user.findUnique({
    where: { clerkId: profile.sub },
  });

  if (byGoogleId) {
    if (!byGoogleId.isActive) {
      throw new Error("This account is inactive. Contact support for help.");
    }

    return byGoogleId;
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
  });

  if (byEmail) {
    if (!byEmail.isActive) {
      throw new Error("This account is inactive. Contact support for help.");
    }

    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        clerkId: profile.sub,
        name: byEmail.name ?? profile.name,
        emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
      },
    });
  }

  // New Google account — create user + workspace (login or signup intent).
  const workspaceName = defaultWorkspaceName(profile);
  const baseSlug = slugify(workspaceName) || "workspace";
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;

  const { user } = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: workspaceName,
        slug,
      },
    });

    const user = await tx.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        clerkId: profile.sub,
        emailVerifiedAt: new Date(),
        lastWorkspaceId: workspace.id,
        emailPreference: {
          create: {},
        },
      },
    });

    await tx.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: "ADMIN",
        permissions: allWorkspacePermissions,
      },
    });

    await attachReferralOnUserCreate(tx, {
      userId: user.id,
      email: user.email,
      referralCode,
    });

    return { user };
  });

  return user;
}

export async function resolveGoogleAuthWorkspaceId(userId: string) {
  const workspaceId = await getDefaultWorkspaceIdForUser(userId);

  if (!workspaceId) {
    throw new Error("No workspace access found for this account. Accept a workspace invite first.");
  }

  return workspaceId;
}
