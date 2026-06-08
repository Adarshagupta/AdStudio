import { Queue } from "bullmq";
import type { GenerationFormat } from "@prisma/client";

import { getBullmqConnection } from "@/lib/redis";

type QueuePayload = {
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

let generationQueue: Queue<QueuePayload> | null = null;

function getGenerationQueue() {
  const connection = getBullmqConnection();
  if (!connection) return null;

  generationQueue ??= new Queue<QueuePayload>("generation", { connection });

  return generationQueue;
}

export async function enqueueGenerationJob(payload: QueuePayload) {
  const queue = getGenerationQueue();

  if (!queue) {
    return null;
  }

  return queue.add("generate-video", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: true,
  });
}
