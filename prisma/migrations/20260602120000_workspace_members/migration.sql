-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- Backfill memberships from legacy user rows
INSERT INTO "WorkspaceMember" ("id", "userId", "workspaceId", "role", "permissions", "isActive", "createdAt")
SELECT
    'wm_' || "id",
    "id",
    "workspaceId",
    "role",
    "permissions",
    "isActive",
    "createdAt"
FROM "User"
WHERE "workspaceId" IS NOT NULL;

-- Add last workspace pointer
ALTER TABLE "User" ADD COLUMN "lastWorkspaceId" TEXT;

UPDATE "User"
SET "lastWorkspaceId" = "workspaceId"
WHERE "workspaceId" IS NOT NULL;

-- Drop legacy workspace columns on users
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_workspaceId_fkey";
ALTER TABLE "User" DROP COLUMN "workspaceId";
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" DROP COLUMN "permissions";

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key" ON "WorkspaceMember"("userId", "workspaceId");
CREATE INDEX "WorkspaceMember_workspaceId_isActive_idx" ON "WorkspaceMember"("workspaceId", "isActive");
CREATE INDEX "WorkspaceMember_userId_isActive_idx" ON "WorkspaceMember"("userId", "isActive");
CREATE INDEX "User_lastWorkspaceId_idx" ON "User"("lastWorkspaceId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastWorkspaceId_fkey" FOREIGN KEY ("lastWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
