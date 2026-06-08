-- CreateEnum
CREATE TYPE "MediaAssetKind" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaAssetSource" AS ENUM ('UPLOADED', 'GENERATED');

-- CreateTable
CREATE TABLE "UserMediaAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "MediaAssetKind" NOT NULL,
    "source" "MediaAssetSource" NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" INTEGER,
    "byteSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserMediaAsset_userId_kind_createdAt_idx" ON "UserMediaAsset"("userId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "UserMediaAsset_workspaceId_createdAt_idx" ON "UserMediaAsset"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserMediaAsset_userId_url_key" ON "UserMediaAsset"("userId", "url");

-- AddForeignKey
ALTER TABLE "UserMediaAsset" ADD CONSTRAINT "UserMediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaAsset" ADD CONSTRAINT "UserMediaAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
