-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('SIZE_1_5', 'SIZE_6_50', 'SIZE_51_100', 'SIZE_100_PLUS');

-- CreateEnum
CREATE TYPE "MonthlyAdSpend" AS ENUM ('UNDER_20K', 'SPEND_20K_100K', 'SPEND_100K_1M', 'SPEND_1M_PLUS');

-- CreateTable
CREATE TABLE "WorkspaceOnboarding" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "companyName" TEXT,
    "companySize" "CompanySize",
    "monthlyAdSpend" "MonthlyAdSpend",
    "hearAboutSource" TEXT,
    "hearAboutOther" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceOnboarding_workspaceId_key" ON "WorkspaceOnboarding"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceOnboarding" ADD CONSTRAINT "WorkspaceOnboarding_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing workspaces skip onboarding
INSERT INTO "WorkspaceOnboarding" ("id", "workspaceId", "completedAt", "createdAt", "updatedAt")
SELECT
    "id" || '_onboarding',
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Workspace"
ON CONFLICT ("workspaceId") DO NOTHING;
