-- Referral program: codes on users, immutable rewards ledger
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredByUserId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX IF NOT EXISTS "User_referredByUserId_idx" ON "User"("referredByUserId");

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_referredByUserId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey"
  FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ReferralReward" (
  "id" TEXT NOT NULL,
  "referrerUserId" TEXT NOT NULL,
  "referrerWorkspaceId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "referredWorkspaceId" TEXT NOT NULL,
  "stripeCheckoutSessionId" TEXT,
  "stripeSubscriptionId" TEXT,
  "plan" "Plan" NOT NULL,
  "creditsAwarded" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_referredUserId_key" ON "ReferralReward"("referredUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_stripeCheckoutSessionId_key" ON "ReferralReward"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_stripeSubscriptionId_key" ON "ReferralReward"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "ReferralReward_referrerUserId_idx" ON "ReferralReward"("referrerUserId");
CREATE INDEX IF NOT EXISTS "ReferralReward_referrerWorkspaceId_idx" ON "ReferralReward"("referrerWorkspaceId");

ALTER TABLE "ReferralReward" DROP CONSTRAINT IF EXISTS "ReferralReward_referrerUserId_fkey";
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referrerUserId_fkey"
  FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralReward" DROP CONSTRAINT IF EXISTS "ReferralReward_referredUserId_fkey";
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referredUserId_fkey"
  FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralReward" DROP CONSTRAINT IF EXISTS "ReferralReward_referrerWorkspaceId_fkey";
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referrerWorkspaceId_fkey"
  FOREIGN KEY ("referrerWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralReward" DROP CONSTRAINT IF EXISTS "ReferralReward_referredWorkspaceId_fkey";
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referredWorkspaceId_fkey"
  FOREIGN KEY ("referredWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
