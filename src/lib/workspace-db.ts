import "server-only";

import type { Plan, Workspace } from "@prisma/client";

import { prisma } from "@/lib/db";
import { isDatabaseSetupError, isPrismaError } from "@/lib/prisma-errors";

const KNOWN_PLANS = new Set<string>(["FREE", "STARTER", "PLUS", "PRO"]);

function normalizePlanValue(plan: string): Plan {
  if (KNOWN_PLANS.has(plan)) {
    return plan as Plan;
  }
  if (plan === "ENTERPRISE") {
    return "PRO";
  }
  return "FREE";
}

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  billingInterval: string | null;
  creditsRemaining: number;
  welcomeCreditsClaimedAt: Date | null;
  paymentSetupSkippedAt: Date | null;
  paymentSetupCompletedAt: Date | null;
  createdAt: Date;
};

/** Loads a workspace even when Prisma enum deserialization fails on legacy plan values. */
export async function findWorkspaceById(id: string): Promise<Workspace | null> {
  try {
    return await prisma.workspace.findUnique({ where: { id } });
  } catch (error) {
    if (!isPrismaError(error)) {
      throw error;
    }

    const rows = await prisma.$queryRaw<WorkspaceRow[]>`
      SELECT
        id,
        name,
        slug,
        plan::text AS plan,
        "stripeCustomerId",
        "stripeSubscriptionId",
        "billingInterval",
        "creditsRemaining",
        "welcomeCreditsClaimedAt",
        "paymentSetupSkippedAt",
        "paymentSetupCompletedAt",
        "createdAt"
      FROM "Workspace"
      WHERE id = ${id}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: normalizePlanValue(row.plan),
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      billingInterval: row.billingInterval,
      creditsRemaining: row.creditsRemaining,
      welcomeCreditsClaimedAt: row.welcomeCreditsClaimedAt,
      paymentSetupSkippedAt: row.paymentSetupSkippedAt,
      paymentSetupCompletedAt: row.paymentSetupCompletedAt,
      agentBrandTone: null,
      agentTargetAudience: null,
      agentDefaultAspectRatio: null,
      createdAt: row.createdAt,
    };
  }
}

export function isMissingWorkspaceMemberTable(error: unknown) {
  return isDatabaseSetupError(error) && isPrismaError(error) && error.code === "P2021";
}
