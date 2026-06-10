import { prisma } from "@/lib/db";

export class InsufficientCreditsError extends Error {
  constructor(public required: number, public remaining: number) {
    super(
      `Insufficient credits. Need ${required} credits, but only ${remaining} remaining.`,
    );
    this.name = "InsufficientCreditsError";
  }
}

export type WorkspaceUsage = {
  videoMinutesUsed: number;
  imageCountUsed: number;
  premiumCreditsUsed: number;
};

/**
 * Get workspace usage stats.
 */
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

/**
 * Track usage for a workspace.
 */
export async function trackUsage(
  workspaceId: string,
  usage: Partial<WorkspaceUsage>,
): Promise<void> {
  const data: {
    videoMinutesUsed?: { increment: number };
    imageCountUsed?: { increment: number };
    premiumCreditsUsed?: { increment: number };
  } = {};
  if (usage.videoMinutesUsed !== undefined) data.videoMinutesUsed = { increment: usage.videoMinutesUsed };
  if (usage.imageCountUsed !== undefined) data.imageCountUsed = { increment: usage.imageCountUsed };
  if (usage.premiumCreditsUsed !== undefined) data.premiumCreditsUsed = { increment: usage.premiumCreditsUsed };

  if (Object.keys(data).length === 0) return;

  await prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });
}

/**
 * Check if a workspace has enough credits.
 * Throws InsufficientCreditsError if not.
 */
export async function checkCredits(
  workspaceId: string,
  cost: number,
): Promise<void> {
  if (cost <= 0) return;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { creditsRemaining: true },
  });

  const remaining = workspace?.creditsRemaining ?? 0;
  if (remaining < cost) {
    throw new InsufficientCreditsError(cost, remaining);
  }
}

/**
 * Atomically deduct credits from a workspace.
 * Returns the new creditsRemaining.
 * Throws InsufficientCreditsError if not enough.
 */
export async function deductCredits(
  workspaceId: string,
  cost: number,
): Promise<number> {
  if (cost <= 0) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { creditsRemaining: true },
    });
    return workspace?.creditsRemaining ?? 0;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { creditsRemaining: true },
  });

  const remaining = workspace?.creditsRemaining ?? 0;
  if (remaining < cost) {
    throw new InsufficientCreditsError(cost, remaining);
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { creditsRemaining: { decrement: cost } },
    select: { creditsRemaining: true },
  });

  return updated.creditsRemaining;
}

type PrismaTransaction = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/**
 * Deduct credits and create a generation record in a single transaction.
 * If credit deduction fails, nothing is created.
 */
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

  const result = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { creditsRemaining: true },
    });

    const remaining = workspace?.creditsRemaining ?? 0;
    if (remaining < cost) {
      throw new InsufficientCreditsError(cost, remaining);
    }

    const updated = await tx.workspace.update({
      where: { id: workspaceId },
      data: { creditsRemaining: { decrement: cost } },
      select: { creditsRemaining: true },
    });

    const created = await createFn(tx as unknown as PrismaTransaction);

    return { creditsRemaining: updated.creditsRemaining, result: created };
  });

  return result;
}

/**
 * Get the credit cost for a generation type.
 */
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
