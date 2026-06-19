import "server-only";

import type { EmailChannel, Prisma, User, WorkspaceInvite } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/integrations/app-url";
import { normalizePermissions } from "@/lib/permissions";
import { buildInviteUrl, createInviteToken, getInviteExpiresAt, hashInviteToken } from "@/lib/team";
import { createEmailToken, getEmailTokenExpiresAt, hashEmailToken } from "@/lib/email/tokens";
import { getEmailConfigStatus, sendTrackedEmail } from "@/lib/email/provider";
import { renderEmail } from "@/lib/email/templates";

const VERIFICATION_TOKEN_HOURS = 48;
const PASSWORD_RESET_TOKEN_HOURS = 2;

export async function sendVerificationEmail(
  userId: string,
  workspaceName?: string,
  origin?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      lastWorkspace: { select: { name: true } },
      memberships: {
        where: { isActive: true },
        take: 1,
        include: { workspace: { select: { name: true } } },
      },
    },
  });

  if (!user || !user.isActive || user.emailVerifiedAt) {
    return;
  }

  const resolvedWorkspaceName =
    workspaceName ??
    user.lastWorkspace?.name ??
    user.memberships[0]?.workspace.name ??
    "LiteMoov";

  const token = await createAuthEmailToken(user.id, user.email, "EMAIL_VERIFICATION", VERIFICATION_TOKEN_HOURS);
  const verifyUrl = `${getAppUrl(origin)}/verify-email/${token}`;
  const content = renderEmail({
    headline: "Verify your email",
    body: `Welcome to ${resolvedWorkspaceName}. Verify this email address so your account is ready for secure sign-in.`,
    actionLabel: "Verify email",
    actionUrl: verifyUrl,
    footer: "This verification link expires in 48 hours.",
  });

  await sendTrackedEmail({
    to: { address: user.email, name: user.name ?? undefined },
    subject: "Verify your LiteMoov account",
    channel: "AUTH",
    workspaceId: user.lastWorkspaceId,
    userId: user.id,
    metadata: { type: "email_verification" },
    ...content,
  });
}

export async function sendPasswordResetEmail(
  user: Pick<User, "id" | "email" | "name" | "lastWorkspaceId">,
  origin?: string,
) {
  const token = await createAuthEmailToken(user.id, user.email, "PASSWORD_RESET", PASSWORD_RESET_TOKEN_HOURS);
  const resetUrl = `${getAppUrl(origin)}/reset-password/${token}`;
  const content = renderEmail({
    headline: "Reset your password",
    body: "Use this secure link to set a new password for your LiteMoov account. If you did not request this, you can ignore this email.",
    actionLabel: "Reset password",
    actionUrl: resetUrl,
    footer: "This password reset link expires in 2 hours.",
  });

  await sendTrackedEmail({
    to: { address: user.email, name: user.name ?? undefined },
    subject: "Reset your LiteMoov password",
    channel: "AUTH",
    workspaceId: user.lastWorkspaceId,
    userId: user.id,
    metadata: { type: "password_reset" },
    ...content,
  });
}

export async function sendWorkspaceInviteEmail({
  inviteId,
  origin,
  token = createInviteToken(),
}: {
  inviteId: string;
  origin?: string;
  token?: string;
}) {
  const invite = await prisma.workspaceInvite.update({
    where: { id: inviteId },
    data: {
      tokenHash: hashInviteToken(token),
      expiresAt: getInviteExpiresAt(),
    },
    include: {
      workspace: true,
      invitedBy: true,
    },
  });
  const inviteUrl = buildInviteUrl(getAppUrl(origin), token);
  const content = renderEmail({
    headline: `Join ${invite.workspace.name}`,
    body: `${invite.invitedBy.name ?? invite.invitedBy.email} invited you to collaborate in ${invite.workspace.name}. Your access is set to ${invite.role.toLowerCase()} with ${countEnabledPermissions(invite.permissions, invite.role)} workspace permissions.`,
    actionLabel: "Accept invite",
    actionUrl: inviteUrl,
    footer: "This invite link expires in 14 days.",
  });

  await sendTrackedEmail({
    to: { address: invite.email, name: invite.name ?? undefined },
    subject: `You are invited to ${invite.workspace.name}`,
    channel: "INVITE",
    workspaceId: invite.workspaceId,
    metadata: { type: "workspace_invite", inviteId: invite.id },
    ...content,
  });

  return { invite, inviteUrl };
}

export async function sendCampaignToWorkspace(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { workspace: true },
  });

  if (!campaign || campaign.status === "CANCELLED") {
    return { sent: 0, skipped: 0 };
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: "SENDING" },
  });

  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      emailVerifiedAt: { not: null },
      memberships: {
        some: {
          workspaceId: campaign.workspaceId,
          isActive: true,
        },
      },
    },
    include: { emailPreference: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    if (!isAllowedByPreference(campaign.channel, recipient.emailPreference)) {
      skipped += 1;
      await logSkippedEmail({
        workspaceId: campaign.workspaceId,
        userId: recipient.id,
        toEmail: recipient.email,
        subject: campaign.subject,
        channel: campaign.channel,
        reason: "User email preferences disabled this channel.",
      });
      continue;
    }

    const content = renderEmail({
      headline: campaign.subject,
      body: campaign.textBody,
      footer: `${campaign.workspace.name}. You can manage email preferences from your account.`,
    });

    await sendTrackedEmail({
      to: { address: recipient.email, name: recipient.name ?? undefined },
      subject: campaign.subject,
      channel: campaign.channel,
      workspaceId: campaign.workspaceId,
      userId: recipient.id,
      metadata: { type: "campaign", campaignId: campaign.id },
      text: campaign.textBody || content.text,
      html: campaign.htmlBody || content.html,
    });
    sent += 1;
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });

  return { sent, skipped };
}

export async function sendReminder(reminderId: string) {
  const reminder = await prisma.emailReminder.findUnique({
    where: { id: reminderId },
    include: {
      workspace: true,
      user: { include: { emailPreference: true } },
    },
  });

  if (!reminder || reminder.status === "CANCELLED") {
    return { sent: 0, skipped: 0 };
  }

  await prisma.emailReminder.update({
    where: { id: reminder.id },
    data: { status: "SENDING" },
  });

  const recipients = reminder.user
    ? [reminder.user]
    : await prisma.user.findMany({
        where: {
          isActive: true,
          emailVerifiedAt: { not: null },
          memberships: {
            some: {
              workspaceId: reminder.workspaceId,
              isActive: true,
            },
          },
        },
        include: { emailPreference: true },
      });

  let sent = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    if (!isAllowedByPreference("REMINDER", recipient.emailPreference)) {
      skipped += 1;
      await logSkippedEmail({
        workspaceId: reminder.workspaceId,
        userId: recipient.id,
        toEmail: recipient.email,
        subject: reminder.title,
        channel: "REMINDER",
        reason: "User reminder emails are disabled.",
      });
      continue;
    }

    const content = renderEmail({
      headline: reminder.title,
      body: reminder.message,
      footer: `${reminder.workspace.name} reminder`,
    });

    await sendTrackedEmail({
      to: { address: recipient.email, name: recipient.name ?? undefined },
      subject: reminder.title,
      channel: "REMINDER",
      workspaceId: reminder.workspaceId,
      userId: recipient.id,
      metadata: { type: "reminder", reminderId: reminder.id },
      ...content,
    });
    sent += 1;
  }

  await prisma.emailReminder.update({
    where: { id: reminder.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });

  return { sent, skipped };
}

export async function dispatchDueEmailWorkspaces() {
  const now = new Date();
  const [campaigns, reminders] = await Promise.all([
    prisma.emailCampaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now },
      },
      select: { id: true },
      take: 25,
    }),
    prisma.emailReminder.findMany({
      where: {
        status: "SCHEDULED",
        sendAt: { lte: now },
      },
      select: { id: true },
      take: 50,
    }),
  ]);

  let campaignsSent = 0;
  let remindersSent = 0;

  for (const campaign of campaigns) {
    await sendCampaignToWorkspace(campaign.id);
    campaignsSent += 1;
  }

  for (const reminder of reminders) {
    await sendReminder(reminder.id);
    remindersSent += 1;
  }

  return { campaignsSent, remindersSent };
}

async function createAuthEmailToken(
  userId: string,
  email: string,
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET",
  expiresInHours: number,
) {
  const token = createEmailToken();

  await prisma.$transaction([
    prisma.emailToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    }),
    prisma.emailToken.create({
      data: {
        userId,
        email,
        type,
        tokenHash: hashEmailToken(token),
        expiresAt: getEmailTokenExpiresAt(expiresInHours),
      },
    }),
  ]);

  return token;
}

function isAllowedByPreference(
  channel: EmailChannel,
  preference: { marketingEnabled: boolean; adsEnabled: boolean; remindersEnabled: boolean } | null,
) {
  if (channel === "AUTH" || channel === "INVITE" || channel === "SYSTEM") {
    return true;
  }

  if (!preference) {
    return true;
  }

  if (channel === "MARKETING") return preference.marketingEnabled;
  if (channel === "ADS") return preference.adsEnabled;
  if (channel === "REMINDER") return preference.remindersEnabled;

  return true;
}

async function logSkippedEmail(input: {
  workspaceId: string;
  userId: string;
  toEmail: string;
  subject: string;
  channel: EmailChannel;
  reason: string;
}) {
  await prisma.emailEvent.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      toEmail: input.toEmail,
      fromEmail: process.env.EMAIL_FROM?.trim() || "noreply@example.com",
      subject: input.subject,
      channel: input.channel,
      status: "SKIPPED",
      provider: getEmailConfigStatus().provider,
      errorMessage: input.reason,
      metadata: { reason: input.reason },
    },
  });
}

function countEnabledPermissions(value: Prisma.JsonValue, role: WorkspaceInvite["role"]) {
  return Object.values(normalizePermissions(value, role)).filter(Boolean).length;
}
