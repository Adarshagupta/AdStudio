#!/usr/bin/env node
/**
 * Clamp all workspace wallet credits to plan caps.
 *
 * Usage:
 *   node scripts/clamp-workspace-credits.mjs          # dry run (default)
 *   node scripts/clamp-workspace-credits.mjs --apply   # write changes
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const WELCOME_CREDIT_BONUS = 5;
const PLAN_CREDITS = { FREE: 0, STARTER: 20, PRO: 35, BUSINESS: 100 };
const TRIAL_STATUSES = new Set(["trialing"]);

const root = process.cwd();
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const apply = process.argv.includes("--apply");
const dryRun = !apply;

let dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl.includes("connection_limit")) {
  dbUrl += dbUrl.includes("?") ? "&connection_limit=1" : "?connection_limit=1";
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

function resolveBillingInterval(interval) {
  return interval === "yearly" ? "yearly" : "monthly";
}

function creditsForSubscription(planId, interval) {
  const base = PLAN_CREDITS[planId] ?? 0;
  if (planId === "FREE") return base;
  return interval === "yearly" ? base * 12 : base;
}

function maxWalletCreditsForWorkspace(workspace) {
  if (TRIAL_STATUSES.has(workspace.subscriptionStatus ?? "")) {
    return 0;
  }

  const planId = PLAN_CREDITS[workspace.plan] !== undefined ? workspace.plan : "FREE";
  if (planId === "FREE") {
    return workspace.welcomeCreditsClaimedAt ? WELCOME_CREDIT_BONUS : 0;
  }

  return creditsForSubscription(planId, resolveBillingInterval(workspace.billingInterval));
}

function clampCreditsToPlanCap(creditsRemaining, maxCredits) {
  return Math.max(0, Math.min(creditsRemaining, maxCredits));
}

async function main() {
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      plan: true,
      billingInterval: true,
      subscriptionStatus: true,
      welcomeCreditsClaimedAt: true,
      creditsRemaining: true,
    },
    orderBy: { creditsRemaining: "desc" },
  });

  let overCap = 0;
  let clampedTotal = 0;

  for (const workspace of workspaces) {
    const maxCredits = maxWalletCreditsForWorkspace(workspace);
    const clamped = clampCreditsToPlanCap(workspace.creditsRemaining, maxCredits);

    if (clamped === workspace.creditsRemaining) {
      continue;
    }

    overCap += 1;
    const delta = workspace.creditsRemaining - clamped;
    clampedTotal += delta;

    console.log(
      `${dryRun ? "[dry-run] " : ""}${workspace.name || workspace.id} (${workspace.plan}): ` +
        `${workspace.creditsRemaining} -> ${clamped} (max ${maxCredits}, -${delta})`,
    );

    if (!dryRun) {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { creditsRemaining: clamped },
      });
    }
  }

  console.log(
    `\n${dryRun ? "Would clamp" : "Clamped"} ${overCap} workspace(s), removing ${clampedTotal} excess credit(s).`,
  );

  if (dryRun && overCap > 0) {
    console.log("Re-run with --apply to persist changes.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
