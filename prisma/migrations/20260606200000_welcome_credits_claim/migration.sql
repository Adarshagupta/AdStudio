-- New workspaces start with 0 credits until the welcome bonus is claimed on the dashboard.
ALTER TABLE "Workspace" ALTER COLUMN "creditsRemaining" SET DEFAULT 0;

ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "welcomeCreditsClaimedAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "paymentSetupSkippedAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "paymentSetupCompletedAt" TIMESTAMP(3);
