import { prisma } from "@/lib/db";
import {
  clampCreditsToPlanCap,
  includedImageLimit,
  includedVideoMinutesLimit,
  maxWalletCreditsForWorkspace,
} from "@/lib/billing/credit-limits";
import { isSubscriptionTrialStatus } from "@/lib/billing/subscription-trial";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";

export class InsufficientCreditsError extends Error {
  constructor(
    public required: number,
    public remaining: number,
  ) {
    super(`Insufficient credits. Need ${required} credits, but only ${remaining} remaining.`);
    this.name = "InsufficientCreditsError";
  }
}

export class TrialPremiumCreditsBlockedError extends Error {
  constructor() {
    super(
      "Premium credits are not available during your free trial. Use included video time and image generations, or wait until your trial converts to a paid subscription.",
    );
    this.name = "TrialPremiumCreditsBlockedError";
  }
}

export class IncludedQuotaExceededError extends Error {
  constructor(
    public kind: "image" | "video",
    public limit: number,
    public used: number,
  ) {
    super(
      kind === "image"
        ? `Included image quota exceeded. Plan limit is ${limit} images (${used} used).`
        : `Included video quota exceeded. Plan limit is ${limit} minutes (${used} used).`,
    );
    this.name = "IncludedQuotaExceededError";
  }
}

export function isPremiumCreditsBlockedError(error: unknown): boolean {
  return error instanceof TrialPremiumCreditsBlockedError;
}

export function isIncludedQuotaExceededError(error: unknown): error is IncludedQuotaExceededError {
  return error instanceof IncludedQuotaExceededError;
}

export function isBillingCreditsError(
  error: unknown,
): error is InsufficientCreditsError | TrialPremiumCreditsBlockedError | IncludedQuotaExceededError {
  return (
    error instanceof InsufficientCreditsError ||
    error instanceof TrialPremiumCreditsBlockedError ||
    error instanceof IncludedQuotaExceededError
  );
}

export type WorkspaceUsage = {
  videoMinutesUsed: number;
  imageCountUsed: number;
  premiumCreditsUsed: number;
};

type SqlClient = Pick<typeof prisma, "$queryRaw" | "workspace">;

async function assertPremiumCreditsAllowed(workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { subscriptionStatus: true, stripeSubscriptionId: true },
  });

  if (isSubscriptionTrialStatus(workspace?.subscriptionStatus)) {
    throw new TrialPremiumCreditsBlockedError();
  }

  if (
    !workspace?.subscriptionStatus &&
    workspace?.stripeSubscriptionId &&
    isStripeConfigured()
  ) {
    try {
      const subscription = await getStripe().subscriptions.retrieve(workspace.stripeSubscriptionId);
      if (subscription.status === "trialing") {
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { subscriptionStatus: "trialing", creditsRemaining: 0 },
        });
        throw new TrialPremiumCreditsBlockedError();
      }
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { subscriptionStatus: subscription.status },
      });
    } catch (error) {
      if (error instanceof TrialPremiumCreditsBlockedError) {
        throw error;
      }
    }
  }
}

async function atomicDeductCreditsTx(
  workspaceId: string,
  cost: number,
  client: SqlClient,
): Promise<number> {
  const updated = await client.$queryRaw<{ creditsRemaining: number }[]>`
    UPDATE "Workspace"
    SET "creditsRemaining" = "creditsRemaining" - ${cost}
    WHERE id = ${workspaceId}
      AND "creditsRemaining" >= ${cost}
    RETURNING "creditsRemaining"
  `;

  if (updated[0]) {
    return updated[0].creditsRemaining;
  }

  const workspace = await client.workspace.findUnique({
    where: { id: workspaceId },
    select: { creditsRemaining: true },
  });
  throw new InsufficientCreditsError(cost, workspace?.creditsRemaining ?? 0);
}

export async function clampWorkspaceCreditsToPlan(workspaceId: string): Promise<number> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      billingInterval: true,
      subscriptionStatus: true,
      welcomeCreditsClaimedAt: true,
      creditsRemaining: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const maxCredits = maxWalletCreditsForWorkspace({
    plan: workspace.plan,
    billingInterval: workspace.billingInterval,
    subscriptionStatus: workspace.subscriptionStatus,
    welcomeCreditsClaimed: Boolean(workspace.welcomeCreditsClaimedAt),
  });

  const clamped = clampCreditsToPlanCap(workspace.creditsRemaining, maxCredits);

  if (clamped !== workspace.creditsRemaining) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { creditsRemaining: clamped },
    });
  }

  return clamped;
}

export async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsage> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { videoMinutesUsed: true, imageCountUsed: true, premiumCreditsUsed: true },
  });

  return {
    videoMinutesUsed: workspace?.videoMinutesUsed ?? 0,
    imageCountUsed: workspace?.imageCountUsed ?? 0,
    premiumCreditsUsed: workspace?.premiumCreditsUsed ?? 0,
  };
}

export async function consumeIncludedQuota(
  workspaceId: string,
  usage: { images?: number; videoMinutes?: number },
): Promise<void> {
  const imageDelta = usage.images ?? 0;
  const videoDelta = usage.videoMinutes ?? 0;

  if (imageDelta <= 0 && videoDelta <= 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        plan: string;
        imageCountUsed: number;
        videoMinutesUsed: number;
      }>
    >`
      SELECT plan, "imageCountUsed", "videoMinutesUsed"
      FROM "Workspace"
      WHERE id = ${workspaceId}
      FOR UPDATE
    `;

    const workspace = rows[0];
    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    if (imageDelta > 0) {
      const limit = includedImageLimit(workspace.plan);
      if (Number.isFinite(limit) && workspace.imageCountUsed + imageDelta > limit) {
        throw new IncludedQuotaExceededError("image", limit, workspace.imageCountUsed);
      }
    }

    if (videoDelta > 0) {
      const limit = includedVideoMinutesLimit(workspace.plan);
      if (workspace.videoMinutesUsed + videoDelta > limit) {
        throw new IncludedQuotaExceededError("video", limit, workspace.videoMinutesUsed);
      }
    }

    await tx.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(imageDelta > 0 ? { imageCountUsed: { increment: imageDelta } } : {}),
        ...(videoDelta > 0 ? { videoMinutesUsed: { increment: videoDelta } } : {}),
      },
    });
  });
}

export async function trackUsage(
  workspaceId: string,
  usage: Partial<WorkspaceUsage>,
): Promise<void> {
  if (usage.imageCountUsed !== undefined && usage.imageCountUsed > 0) {
    await consumeIncludedQuota(workspaceId, { images: usage.imageCountUsed });
  }

  if (usage.videoMinutesUsed !== undefined && usage.videoMinutesUsed > 0) {
    await consumeIncludedQuota(workspaceId, { videoMinutes: usage.videoMinutesUsed });
  }

  if (usage.premiumCreditsUsed !== undefined && usage.premiumCreditsUsed > 0) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { premiumCreditsUsed: { increment: usage.premiumCreditsUsed } },
    });
  }
}

export async function checkCredits(workspaceId: string, cost: number): Promise<void> {
  if (cost <= 0) return;

  await assertPremiumCreditsAllowed(workspaceId);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { creditsRemaining: true },
  });

  const remaining = workspace?.creditsRemaining ?? 0;
  if (remaining < cost) {
    throw new InsufficientCreditsError(cost, remaining);
  }
}

export async function deductCredits(workspaceId: string, cost: number): Promise<number> {
  if (cost <= 0) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { creditsRemaining: true },
    });
    return workspace?.creditsRemaining ?? 0;
  }

  await assertPremiumCreditsAllowed(workspaceId);
  return atomicDeductCreditsTx(workspaceId, cost, prisma);
}

type PrismaTransaction = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export async function deductCreditsWithGeneration<T>(
  workspaceId: string,
  cost: number,
  createFn: (tx: PrismaTransaction) => Promise<T>,
): Promise<{ creditsRemaining: number; result: T }> {
  if (cost <= 0) {
    const result = await createFn(prisma);
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { creditsRemaining: true },
    });
    return { creditsRemaining: workspace?.creditsRemaining ?? 0, result };
  }

  await assertPremiumCreditsAllowed(workspaceId);

  const result = await prisma.$transaction(async (tx) => {
    const creditsRemaining = await atomicDeductCreditsTx(workspaceId, cost, tx);
    const created = await createFn(tx as unknown as PrismaTransaction);
    return { creditsRemaining, result: created };
  });

  return result;
}

export function getGenerationCost(
  type: "image" | "video" | "audio" | "script" | "social",
  options?: { durationSec?: number; imageCount?: number; isPremium?: boolean },
): number {
  switch (type) {
    case "image":
      return options?.isPremium ? 1 : 1;
    case "video":
      return options?.isPremium ? 2 : 1;
    case "audio":
      return 1;
    case "script":
      return 1;
    case "social":
      return 1;
    default:
      return 1;
  }
}

export { maxWalletCreditsForWorkspace, clampCreditsToPlanCap } from "@/lib/billing/credit-limits";
