-- CreateEnum
CREATE TYPE "StudioTemplateListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "StudioTemplateListing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "previewImageUrl" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "StudioTemplateListingStatus" NOT NULL DEFAULT 'DRAFT',
    "publisherUserId" TEXT NOT NULL,
    "publisherWorkspaceId" TEXT NOT NULL,
    "sourceFlowId" TEXT,
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "viewport" JSONB NOT NULL DEFAULT '{}',
    "category" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioTemplateListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioTemplatePurchase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "purchasedByUserId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioTemplatePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioTemplateListing_slug_key" ON "StudioTemplateListing"("slug");

-- CreateIndex
CREATE INDEX "StudioTemplateListing_status_createdAt_idx" ON "StudioTemplateListing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StudioTemplateListing_publisherWorkspaceId_status_idx" ON "StudioTemplateListing"("publisherWorkspaceId", "status");

-- CreateIndex
CREATE INDEX "StudioTemplateListing_category_idx" ON "StudioTemplateListing"("category");

-- CreateIndex
CREATE UNIQUE INDEX "StudioTemplatePurchase_stripeCheckoutSessionId_key" ON "StudioTemplatePurchase"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioTemplatePurchase_workspaceId_listingId_key" ON "StudioTemplatePurchase"("workspaceId", "listingId");

-- CreateIndex
CREATE INDEX "StudioTemplatePurchase_listingId_idx" ON "StudioTemplatePurchase"("listingId");

-- CreateIndex
CREATE INDEX "StudioTemplatePurchase_workspaceId_idx" ON "StudioTemplatePurchase"("workspaceId");

-- AddForeignKey
ALTER TABLE "StudioTemplateListing" ADD CONSTRAINT "StudioTemplateListing_publisherUserId_fkey" FOREIGN KEY ("publisherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTemplateListing" ADD CONSTRAINT "StudioTemplateListing_publisherWorkspaceId_fkey" FOREIGN KEY ("publisherWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTemplatePurchase" ADD CONSTRAINT "StudioTemplatePurchase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTemplatePurchase" ADD CONSTRAINT "StudioTemplatePurchase_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "StudioTemplateListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTemplatePurchase" ADD CONSTRAINT "StudioTemplatePurchase_purchasedByUserId_fkey" FOREIGN KEY ("purchasedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
