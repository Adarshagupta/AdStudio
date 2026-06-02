import { Worker } from "bullmq";
import type { GenerationFormat } from "@prisma/client";

import { generateScript, startVideoGeneration } from "@/lib/cloudflare-ai";

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
  if (!process.env.REDIS_URL) {
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
      connection: {
        url: process.env.REDIS_URL,
      },
      autorun: false,
    },
  );
}
