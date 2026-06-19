ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "dodoCustomerId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "dodoSubscriptionId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "billingProvider" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_dodoCustomerId_key" ON "Workspace"("dodoCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_dodoSubscriptionId_key" ON "Workspace"("dodoSubscriptionId");
