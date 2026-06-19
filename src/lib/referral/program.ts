import "server-only";

import { randomBytes } from "crypto";
import type { Plan, Prisma } from "@prisma/client";

import type { SubscriptionPlanId } from "@/lib/billing/plans";
import {
  clampCreditsToPlanCap,
  maxWalletCreditsForWorkspace,
} from "@/lib/billing/credit-limits";
import { prisma } from "@/lib/db";
import { notifyWorkspaceAdmins } from "@/lib/notifications/service";
import { getDefaultWorkspaceIdForUser } from "@/lib/workspace-members";

import {
  isValidReferralCodeFormat,
  normalizeReferralCode,
  REFERRAL_REWARD_CREDITS,
} from "@/lib/referral/codes";

const PAID_PLANS = new Set<SubscriptionPlanId>(["STARTER", "PRO", "BUSINESS"]);

type PrismaTx = Prisma.TransactionClient;

export {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_REWARD_CREDITS,
  isValidReferralCodeFormat,
  normalizeReferralCode,
  readReferralCodeFromCookie,
} from "@/lib/referral/codes";

async function generateUniqueReferralCode(tx: PrismaTx) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomBytes(6)
      .toString("base64url")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase()
      .padEnd(8, "X");

    const existing = await tx.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not generate a unique referral code.");
}

export async function ensureUserReferralCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.referralCode) {
    return user.referralCode;
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (current?.referralCode) {
      return current.referralCode;
    }

    const referralCode = await generateUniqueReferralCode(tx);

    await tx.user.update({
      where: { id: userId },
      data: { referralCode },
    });

    return referralCode;
  });
}

export async function resolveReferrerUserId(
  tx: PrismaTx,
  referralCode: string | null | undefined,
  newUserEmail: string,
) {
  if (!referralCode?.trim()) {
    return null;
  }

  const normalized = normalizeReferralCode(referralCode);
  if (!isValidReferralCodeFormat(normalized)) {
    return null;
  }

  const referrer = await tx.user.findUnique({
    where: { referralCode: normalized },
    select: { id: true, email: true, isActive: true },
  });

  if (!referrer?.isActive) {
    return null;
  }

  if (referrer.email.toLowerCase() === newUserEmail.trim().toLowerCase()) {
    return null;
  }

  return referrer.id;
}

export async function attachReferralOnUserCreate(
  tx: PrismaTx,
  input: {
    userId: string;
    email: string;
    referralCode?: string | null;
  },
) {
  const [referralCode, referredByUserId] = await Promise.all([
    generateUniqueReferralCode(tx),
    resolveReferrerUserId(tx, input.referralCode, input.email),
  ]);

  await tx.user.update({
    where: { id: input.userId },
    data: {
      referralCode,
      ...(referredByUserId ? { referredByUserId } : {}),
    },
  });

  return { referralCode, referredByUserId };
}

/** Assigns a referral code to legacy accounts created before the referral program. */
export async function ensureReferralProfileForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, referralCode: true },
  });

  if (!user || user.referralCode) {
    return user?.referralCode ?? null;
  }

  return prisma.$transaction(async (tx) => {
    const { referralCode } = await attachReferralOnUserCreate(tx, {
      userId: user.id,
      email: user.email,
      referralCode: null,
    });
    return referralCode;
  });
}

/** Repair signups that completed before referral tracking was enabled. */
export async function retrofitReferralAttribution(input: {
  referredUserEmail: string;
  referrerReferralCode: string;
}) {
  const referredEmail = input.referredUserEmail.trim().toLowerCase();
  const referrerCode = normalizeReferralCode(input.referrerReferralCode);

  if (!isValidReferralCodeFormat(referrerCode)) {
    throw new Error("Invalid referrer code.");
  }

  const [referredUser, referrer] = await Promise.all([
    prisma.user.findUnique({
      where: { email: referredEmail },
      select: { id: true, email: true, referredByUserId: true, referralCode: true },
    }),
    prisma.user.findUnique({
      where: { referralCode: referrerCode },
      select: { id: true, email: true },
    }),
  ]);

  if (!referredUser) {
    throw new Error("Referred user not found.");
  }

  if (!referrer) {
    throw new Error("Referrer code not found.");
  }

  if (referredUser.referredByUserId) {
    return { ok: true, alreadyAttributed: true, referredUserId: referredUser.id };
  }

  if (referrer.id === referredUser.id) {
    throw new Error("Self-referrals are not allowed.");
  }

  await prisma.$transaction(async (tx) => {
    if (!referredUser.referralCode) {
      await attachReferralOnUserCreate(tx, {
        userId: referredUser.id,
        email: referredUser.email,
        referralCode: null,
      });
    }

    await tx.user.update({
      where: { id: referredUser.id },
      data: { referredByUserId: referrer.id },
    });
  });

  return { ok: true, alreadyAttributed: false, referredUserId: referredUser.id, referrerUserId: referrer.id };
}

export type ReferralSubscriptionRewardInput = {
  referredUserId: string;
  referredWorkspaceId: string;
  plan: SubscriptionPlanId;
  stripeCheckoutSessionId?: string | null;
  stripeSubscriptionId?: string | null;
};

export async function processReferralSubscriptionReward(input: ReferralSubscriptionRewardInput) {
  if (!PAID_PLANS.has(input.plan)) {
    return null;
  }

  const referredUser = await prisma.user.findUnique({
    where: { id: input.referredUserId },
    select: {
      id: true,
      referredByUserId: true,
      email: true,
    },
  });

  if (!referredUser?.referredByUserId) {
    return null;
  }

  if (referredUser.referredByUserId === referredUser.id) {
    return null;
  }

  const existingReward = await prisma.referralReward.findUnique({
    where: { referredUserId: referredUser.id },
    select: { id: true },
  });

  if (existingReward) {
    return null;
  }

  const referrerWorkspaceId = await getDefaultWorkspaceIdForUser(referredUser.referredByUserId);

  if (!referrerWorkspaceId) {
    console.warn("[referral] referrer has no workspace:", referredUser.referredByUserId);
    return null;
  }

  try {
    const reward = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.referralReward.findUnique({
        where: { referredUserId: referredUser.id },
        select: { id: true },
      });

      if (duplicate) {
        return null;
      }

      const referrerWorkspace = await tx.workspace.findUnique({
        where: { id: referrerWorkspaceId },
        select: {
          plan: true,
          billingInterval: true,
          subscriptionStatus: true,
          welcomeCreditsClaimedAt: true,
          creditsRemaining: true,
        },
      });

      if (!referrerWorkspace) {
        return null;
      }

      const maxCredits = maxWalletCreditsForWorkspace({
        plan: referrerWorkspace.plan,
        billingInterval: referrerWorkspace.billingInterval,
        subscriptionStatus: referrerWorkspace.subscriptionStatus,
        welcomeCreditsClaimed: Boolean(referrerWorkspace.welcomeCreditsClaimedAt),
      });

      const nextCredits = clampCreditsToPlanCap(
        referrerWorkspace.creditsRemaining + REFERRAL_REWARD_CREDITS,
        maxCredits,
      );

      const creditsGranted = Math.max(0, nextCredits - referrerWorkspace.creditsRemaining);

      const created = await tx.referralReward.create({
        data: {
          referrerUserId: referredUser.referredByUserId!,
          referrerWorkspaceId,
          referredUserId: referredUser.id,
          referredWorkspaceId: input.referredWorkspaceId,
          stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
          stripeSubscriptionId: input.stripeSubscriptionId ?? null,
          plan: input.plan as Plan,
          creditsAwarded: creditsGranted,
        },
      });

      if (creditsGranted > 0) {
        await tx.workspace.update({
          where: { id: referrerWorkspaceId },
          data: {
            creditsRemaining: nextCredits,
          },
        });
      }

      return created;
    });

    if (!reward) {
      return null;
    }

    void notifyWorkspaceAdmins(referrerWorkspaceId, {
      type: "SYSTEM",
      title: "Referral reward",
      message: `You earned ${REFERRAL_REWARD_CREDITS} credits — a referral subscribed to ${input.plan}.`,
    });

    return reward;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unique constraint") || error.message.includes("unique constraint"))
    ) {
      return null;
    }

    throw error;
  }
}

export async function getReferralProgramSummary(userId: string) {
  await ensureReferralProfileForUser(userId);
  const referralCode = await ensureUserReferralCode(userId);

  const [rewards, referralCount] = await Promise.all([
    prisma.referralReward.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        creditsAwarded: true,
        plan: true,
        createdAt: true,
        referredUser: {
          select: { email: true, name: true },
        },
      },
    }),
    prisma.user.count({
      where: { referredByUserId: userId },
    }),
  ]);

  const totalCreditsEarned = rewards.reduce((sum, reward) => sum + reward.creditsAwarded, 0);

  return {
    referralCode,
    creditsPerReferral: REFERRAL_REWARD_CREDITS,
    totalSignups: referralCount,
    successfulReferrals: rewards.length,
    totalCreditsEarned,
    rewards: rewards.map((reward) => ({
      id: reward.id,
      creditsAwarded: reward.creditsAwarded,
      plan: reward.plan,
      createdAt: reward.createdAt.toISOString(),
      referredEmail: maskEmail(reward.referredUser.email),
      referredName: reward.referredUser.name,
    })),
  };
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function buildReferralSignupUrl(appUrl: string, referralCode: string) {
  const url = new URL("/signup", appUrl);
  url.searchParams.set("ref", referralCode);
  return url.toString();
}
