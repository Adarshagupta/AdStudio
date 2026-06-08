import { Worker } from "bullmq";
import type { GenerationFormat } from "@prisma/client";

import { generateScript } from "@/lib/cloudflare-ai";
import { getBullmqConnection } from "@/lib/redis";
import { renderLongFormVideo } from "@/lib/studio-pro/long-form";
import { LONG_FORM_QUEUE_NAME, type LongFormRenderQueuePayload } from "@/lib/studio-pro/long-form-queue";
import { startVideoGeneration } from "@/lib/video-generation";

type GenerationJob = {
  generationId: string;
  format: GenerationFormat;
  prompt: string;
  productUrl?: string;
  scriptText?: string;
  avatarId?: string;
  style?: {
    aspectRatio?: string;
    duration?: number;
    resolution?: string;
    captionStyle?: string;
    musicEnabled?: boolean;
  };
};

export function startGenerationWorker() {
  const connection = getBullmqConnection();
  if (!connection) {
    return null;
  }

  return new Worker<GenerationJob>(
    "generation",
    async (job) => {
      const script =
        job.data.scriptText ??
        (await generateScript({
          prompt: job.data.prompt,
          format: job.data.format,
          productUrl: job.data.productUrl,
        }));
      const videoJob = await startVideoGeneration({
        prompt: job.data.prompt,
        scriptText: script,
        format: job.data.format,
        style: job.data.style,
      });

      return {
        generationId: job.data.generationId,
        xaiRequestId: videoJob.requestId,
        status: "PROCESSING",
      };
    },
    {
      connection,
      autorun: false,
    },
  );
}

export function startLongFormRenderWorker() {
  const connection = getBullmqConnection();
  if (!connection) {
    return null;
  }

  return new Worker<LongFormRenderQueuePayload>(
    LONG_FORM_QUEUE_NAME,
    async (job) => {
      const rendered = await renderLongFormVideo(job.data.jobId, {
        requestOrOrigin: job.data.origin,
      });

      return {
        jobId: rendered.id,
        status: rendered.status,
        finalVideoUrl: rendered.finalVideoUrl,
      };
    },
    {
      connection,
      autorun: false,
      concurrency: 1,
    },
  );
}
