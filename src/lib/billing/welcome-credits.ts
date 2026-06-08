import { planCreditAllocation } from "@/lib/billing/plans";
import { prisma } from "@/lib/db";

export const WELCOME_CREDIT_BONUS = planCreditAllocation.FREE;

export type WorkspaceWelcomeStatus = {
  creditsRemaining: number;
  welcomeCreditsClaimed: boolean;
  paymentSetupResolved: boolean;
  paymentSetupCompleted: boolean;
  paymentSetupSkipped: boolean;
};

type WelcomeRow = {
  creditsRemaining: number;
  welcomeCreditsClaimedAt: Date | null;
  paymentSetupSkippedAt: Date | null;
  paymentSetupCompletedAt: Date | null;
};

type PaymentSetupRow = {
  paymentSetupSkippedAt: Date | null;
  paymentSetupCompletedAt: Date | null;
};

type SqlClient = Pick<typeof prisma, "$queryRaw">;

/** Raw SQL keeps welcome-credit reads working even when a stale Prisma client is loaded. */
async function loadWelcomeRow(workspaceId: string, client: SqlClient = prisma) {
  const rows = await client.$queryRaw<WelcomeRow[]>`
    SELECT
      "creditsRemaining",
      "welcomeCreditsClaimedAt",
      "paymentSetupSkippedAt",
      "paymentSetupCompletedAt"
    FROM "Workspace"
    WHERE id = ${workspaceId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export function serializeWorkspaceWelcomeStatus(workspace: WelcomeRow): WorkspaceWelcomeStatus {
  return {
    creditsRemaining: workspace.creditsRemaining,
    welcomeCreditsClaimed: Boolean(workspace.welcomeCreditsClaimedAt),
    paymentSetupResolved: Boolean(
      workspace.paymentSetupSkippedAt || workspace.paymentSetupCompletedAt,
    ),
    paymentSetupCompleted: Boolean(workspace.paymentSetupCompletedAt),
    paymentSetupSkipped: Boolean(workspace.paymentSetupSkippedAt),
  };
}

export function shouldShowWelcomeCreditsCard(status: WorkspaceWelcomeStatus, isAdmin: boolean) {
  if (!isAdmin) {
    return !status.welcomeCreditsClaimed;
  }
  return !status.welcomeCreditsClaimed || !status.paymentSetupResolved;
}

export async function getWorkspaceWelcomeStatus(workspaceId: string) {
  const workspace = await loadWelcomeRow(workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  return serializeWorkspaceWelcomeStatus(workspace);
}

export async function claimWelcomeCredits(workspaceId: string, actorUserId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: actorUserId,
        workspaceId,
      },
    },
    select: { role: true, isActive: true },
  });

  if (!membership?.isActive || membership.role !== "ADMIN") {
    throw new Error("Only workspace admins can claim welcome credits.");
  }

  return prisma.$transaction(async (tx) => {
    const workspace = await loadWelcomeRow(workspaceId, tx);

    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    if (workspace.welcomeCreditsClaimedAt) {
      return {
        alreadyClaimed: true,
        creditsRemaining: workspace.creditsRemaining,
        bonus: WELCOME_CREDIT_BONUS,
      };
    }

    const updated = await tx.$queryRaw<{ creditsRemaining: number }[]>`
      UPDATE "Workspace"
      SET
        "welcomeCreditsClaimedAt" = NOW(),
        "creditsRemaining" = "creditsRemaining" + ${WELCOME_CREDIT_BONUS}
      WHERE id = ${workspaceId}
        AND "welcomeCreditsClaimedAt" IS NULL
      RETURNING "creditsRemaining"
    `;

    const creditsRemaining = updated[0]?.creditsRemaining ?? workspace.creditsRemaining;

    return {
      alreadyClaimed: false,
      creditsRemaining,
      bonus: WELCOME_CREDIT_BONUS,
    };
  });
}

export async function skipPaymentSetup(workspaceId: string, actorUserId: string) {
  await assertWorkspaceAdmin(workspaceId, actorUserId);

  const rows = await prisma.$queryRaw<PaymentSetupRow[]>`
    UPDATE "Workspace"
    SET
      "paymentSetupSkippedAt" = NOW(),
      "paymentSetupCompletedAt" = NULL
    WHERE id = ${workspaceId}
    RETURNING "paymentSetupSkippedAt", "paymentSetupCompletedAt"
  `;

  return rows[0] ?? { paymentSetupSkippedAt: new Date(), paymentSetupCompletedAt: null };
}

export async function completePaymentSetup(workspaceId: string, actorUserId: string) {
  await assertWorkspaceAdmin(workspaceId, actorUserId);

  const rows = await prisma.$queryRaw<PaymentSetupRow[]>`
    UPDATE "Workspace"
    SET
      "paymentSetupCompletedAt" = NOW(),
      "paymentSetupSkippedAt" = NULL
    WHERE id = ${workspaceId}
    RETURNING "paymentSetupSkippedAt", "paymentSetupCompletedAt"
  `;

  return rows[0] ?? { paymentSetupSkippedAt: null, paymentSetupCompletedAt: new Date() };
}

async function assertWorkspaceAdmin(workspaceId: string, actorUserId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: actorUserId,
        workspaceId,
      },
    },
    select: { role: true, isActive: true },
  });

  if (!membership?.isActive || membership.role !== "ADMIN") {
    throw new Error("Only workspace admins can update payment setup.");
  }
}
