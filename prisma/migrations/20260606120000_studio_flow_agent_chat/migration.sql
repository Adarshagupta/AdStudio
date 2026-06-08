-- AlterTable
ALTER TABLE "StudioFlow" ADD COLUMN "agentChat" JSONB NOT NULL DEFAULT '{"messages":[],"requestHistory":[],"updatedAt":""}';
