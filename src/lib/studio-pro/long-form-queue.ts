import "server-only";

import { Queue } from "bullmq";

import { getBullmqConnection } from "@/lib/redis";

export type LongFormRenderQueuePayload = {
  jobId: string;
  origin?: string;
};

const LONG_FORM_QUEUE_NAME = "studio-long-form";

let longFormQueue: Queue<LongFormRenderQueuePayload> | null = null;

function getLongFormQueue() {
  const connection = getBullmqConnection();
  if (!connection) return null;

  longFormQueue ??= new Queue<LongFormRenderQueuePayload>(LONG_FORM_QUEUE_NAME, {
    connection,
  });
  return longFormQueue;
}

export async function enqueueLongFormRenderJob(payload: LongFormRenderQueuePayload) {
  const queue = getLongFormQueue();
  if (!queue) return null;

  return queue.add("render-long-form-video", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

export { LONG_FORM_QUEUE_NAME };
