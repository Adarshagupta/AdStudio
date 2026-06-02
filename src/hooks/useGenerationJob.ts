"use client";

import { useCallback, useState } from "react";

import {
  defaultGenerationStyle,
  pollGenerationUntilComplete,
  startGeneration,
  type GenerationJobStatus,
  type GenerationStyle,
} from "@/lib/generation-client";
import type { GenerationFormat } from "@prisma/client";

export type GenerationPhase = "idle" | "starting" | "processing" | "done" | "failed";

export function useGenerationJob() {
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [jobId, setJobId] = useState<string>();
  const [scriptText, setScriptText] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [jobStatus, setJobStatus] = useState<GenerationJobStatus>();
  const [error, setError] = useState<string>();

  const reset = useCallback(() => {
    setPhase("idle");
    setJobId(undefined);
    setScriptText(undefined);
    setVideoUrl(undefined);
    setJobStatus(undefined);
    setError(undefined);
  }, []);

  const run = useCallback(
    async (input: {
      format: GenerationFormat;
      prompt: string;
      productUrl?: string;
      avatarId?: string;
      style?: Partial<GenerationStyle>;
    }) => {
      setPhase("starting");
      setError(undefined);
      setVideoUrl(undefined);
      setJobId(undefined);
      setScriptText(undefined);
      setJobStatus(undefined);

      try {
        const started = await startGeneration({
          format: input.format,
          prompt: input.prompt,
          productUrl: input.productUrl,
          avatarId: input.avatarId,
          style: { ...defaultGenerationStyle, ...input.style },
        });

        setJobId(started.jobId);
        setScriptText(started.scriptText);
        setJobStatus(started.status);
        setPhase("processing");

        const completed = await pollGenerationUntilComplete(started.jobId, {
          onStatus: setJobStatus,
        });

        setVideoUrl(completed.videoUrl);
        setJobStatus("COMPLETED");
        setPhase("done");
      } catch (err) {
        setPhase("failed");
        setError(err instanceof Error ? err.message : "Generation failed.");
      }
    },
    [],
  );

  return {
    phase,
    jobId,
    scriptText,
    videoUrl,
    jobStatus,
    error,
    isRunning: phase === "starting" || phase === "processing",
    run,
    reset,
  };
}
