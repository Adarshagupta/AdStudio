"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GenerationProgress } from "@/components/generations/GenerationProgress";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TypeBadge } from "@/components/shared/TypeBadge";
import type { GenerationPhase } from "@/hooks/useGenerationJob";
import {
  fetchGenerationStatus,
  isTransientGenerationStatusError,
  type GenerationJobStatus,
} from "@/lib/generation-client";
import type { DashboardOutputType } from "@/lib/dashboard-generation";
import { notify } from "@/lib/notify";
import type { GenerationFormat, GenerationStatus } from "@prisma/client";

function mapStatusToPhase(status: GenerationStatus): GenerationPhase {
  if (status === "COMPLETED") return "done";
  if (status === "FAILED") return "failed";
  if (status === "QUEUED") return "starting";
  return "processing";
}

export function GenerationView({
  generationId,
  prompt,
  format,
  outputType = "video",
  initialStatus,
  initialScriptText,
  initialVideoUrl,
  initialThumbnailUrl,
  initialError,
}: {
  generationId: string;
  prompt: string;
  format: GenerationFormat;
  outputType?: DashboardOutputType;
  initialStatus: GenerationStatus;
  initialScriptText?: string | null;
  initialVideoUrl?: string | null;
  initialThumbnailUrl?: string | null;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<GenerationPhase>(() => mapStatusToPhase(initialStatus));
  const [jobStatus, setJobStatus] = useState<GenerationJobStatus>(initialStatus);
  const [scriptText, setScriptText] = useState(initialScriptText ?? undefined);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl ?? undefined);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbnailUrl ?? undefined);
  const [error, setError] = useState(initialError ?? undefined);

  useEffect(() => {
    if (initialError) {
      notify.error(initialError);
    }
  }, [initialError]);

  useEffect(() => {
    if (initialStatus === "COMPLETED" || initialStatus === "FAILED") {
      return;
    }

    let cancelled = false;

    async function poll() {
      for (let attempt = 0; attempt < 180; attempt += 1) {
        if (cancelled) return;

        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 0 : 5000));

        try {
          const data = await fetchGenerationStatus(generationId);
          if (cancelled) return;

          if (data.status) {
            setJobStatus(data.status);
          }

          const nextScript = data.scriptText;
          if (nextScript) {
            setScriptText(nextScript);
          }

          if (data.status === "COMPLETED") {
            if (data.videoUrl) {
              setVideoUrl(data.videoUrl);
            }
            if (data.thumbnailUrl) {
              setThumbnailUrl(data.thumbnailUrl);
            }
            if (data.videoUrl || data.thumbnailUrl) {
              setPhase("done");
              return;
            }
          }

          if (data.status === "FAILED") {
            const message = data.errorMessage ?? "Generation failed.";
            setError(message);
            notify.error(message);
            setPhase("failed");
            return;
          }

          setPhase(data.status === "QUEUED" ? "starting" : "processing");
        } catch (err) {
          if (cancelled) return;
          if (isTransientGenerationStatusError(err) && attempt < 179) {
            setJobStatus("PROCESSING");
            setPhase("processing");
            continue;
          }

          const message = err instanceof Error ? err.message : "Status polling failed.";
          setError(message);
          notify.error(message);
          setPhase("failed");
          return;
        }
      }

      const message = "Timed out waiting for video generation.";
      setError(message);
      notify.error(message);
      setPhase("failed");
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [generationId, initialStatus]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Generation</p>
        <h1 className="font-display text-3xl font-semibold text-zinc-900 md:text-4xl">{prompt}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">{generationId}</code>
          <TypeBadge type={format} />
          <StatusBadge status={jobStatus as GenerationStatus} />
        </div>
      </div>

      <GenerationProgress
        generationId={generationId}
        outputType={outputType}
        phase={phase}
        jobStatus={jobStatus}
        scriptText={scriptText}
        videoUrl={videoUrl}
        thumbnailUrl={thumbnailUrl}
        error={error}
        onReset={() => router.push("/dashboard")}
      />
    </div>
  );
}
