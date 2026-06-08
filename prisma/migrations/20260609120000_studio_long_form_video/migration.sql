-- CreateTable
CREATE TABLE "StudioLongFormVideo" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studioFlowId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Long-form video',
    "prompt" TEXT,
    "targetDurationSec" INTEGER,
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "finalVideoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "errorMessage" TEXT,
    "renderTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StudioLongFormVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioLongFormSegment" (
    "id" TEXT NOT NULL,
    "longFormVideoId" TEXT NOT NULL,
    "generationId" TEXT,
    "nodeId" TEXT,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "videoUrl" TEXT,
    "durationSec" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StudioLongFormSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioLongFormVideo_workspaceId_createdAt_idx" ON "StudioLongFormVideo"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "StudioLongFormVideo_userId_idx" ON "StudioLongFormVideo"("userId");

-- CreateIndex
CREATE INDEX "StudioLongFormVideo_studioFlowId_idx" ON "StudioLongFormVideo"("studioFlowId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioLongFormSegment_longFormVideoId_index_key" ON "StudioLongFormSegment"("longFormVideoId", "index");

-- CreateIndex
CREATE INDEX "StudioLongFormSegment_generationId_idx" ON "StudioLongFormSegment"("generationId");

-- CreateIndex
CREATE INDEX "StudioLongFormSegment_nodeId_idx" ON "StudioLongFormSegment"("nodeId");

-- AddForeignKey
ALTER TABLE "StudioLongFormVideo" ADD CONSTRAINT "StudioLongFormVideo_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioLongFormVideo" ADD CONSTRAINT "StudioLongFormVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioLongFormSegment" ADD CONSTRAINT "StudioLongFormSegment_longFormVideoId_fkey" FOREIGN KEY ("longFormVideoId") REFERENCES "StudioLongFormVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
