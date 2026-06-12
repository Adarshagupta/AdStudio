"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

import { ChatScriptView } from "@/components/dashboard/ChatScriptView";
import { ImageWithEdit } from "@/components/shared/ImageWithEdit";
import { Button } from "@/components/ui/button";
import type { GenerationPhase } from "@/hooks/useGenerationJob";
import type { DashboardOutputType } from "@/lib/dashboard-generation";
import type { GenerationJobStatus } from "@/lib/generation-client";
import { cn } from "@/lib/utils";

const videoSteps = [
  { id: "script", label: "Writing script", description: "Turning your brief into a usable ad script." },
  { id: "video", label: "Rendering video", description: "Generating the final cut with LTX." },
  { id: "done", label: "Ready to review", description: "Your ad is ready to preview and export." },
] as const;

const imageSteps = [
  { id: "image", label: "Generating image", description: "Creating your ad still from the prompt." },
  { id: "done", label: "Ready to review", description: "Your image is ready to preview and download." },
] as const;

function stepState(
  stepId: string,
  phase: GenerationPhase,
  outputType: DashboardOutputType,
) {
  if (outputType === "image") {
    if (phase === "failed") {
      if (stepId === "image") return "failed";
      return "pending";
    }
    if (stepId === "image") {
      return phase === "done" ? "done" : "active";
    }
    if (stepId === "done") {
      return phase === "done" ? "done" : "pending";
    }
    return "pending";
  }

  if (phase === "failed") {
    if (stepId === "script") return "done";
    if (stepId === "video") return "failed";
    return "pending";
  }

  if (phase === "idle") return "pending";

  if (stepId === "script") {
    if (phase === "starting") return "active";
    return "done";
  }

  if (stepId === "video") {
    if (phase === "starting") return "pending";
    if (phase === "processing") return "active";
    if (phase === "done") return "done";
    return "pending";
  }

  if (stepId === "done") {
    return phase === "done" ? "done" : "pending";
  }

  return "pending";
}

export function GenerationProgress({
  generationId,
  outputType = "video",
  phase,
  jobStatus,
  scriptText,
  videoUrl,
  thumbnailUrl,
  error,
  onReset,
}: {
  generationId: string;
  outputType?: DashboardOutputType;
  phase: GenerationPhase;
  jobStatus?: GenerationJobStatus;
  scriptText?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  onReset: () => void;
}) {
  const steps = outputType === "image" ? imageSteps : videoSteps;
  const previewUrl = outputType === "image" ? thumbnailUrl : videoUrl;

  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] md:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-zinc-900">
              {phase === "done"
                ? outputType === "image"
                  ? "Your image is ready"
                  : "Your ad is ready"
                : phase === "failed"
                  ? "Generation failed"
                  : outputType === "image"
                    ? "Creating your image"
                    : "Creating your ad"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {phase === "failed"
                ? error
                : phase === "done"
                  ? "Preview the result below or start a new generation."
                  : "This page tracks generation progress for your job."}
            </p>
            <p className="mt-2 text-xs text-zinc-400">Job ID: {generationId}</p>
          </div>

          <ol className="space-y-3">
            {steps.map((step) => {
              const state = stepState(step.id, phase, outputType);

              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl px-3 py-3",
                    state === "active" && "bg-purple-50/70",
                    state === "done" && "bg-zinc-50",
                    state === "failed" && "bg-red-50/70",
                  )}
                >
                  <div className="mt-0.5">
                    {state === "active" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    ) : state === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : state === "failed" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-zinc-300" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{step.label}</p>
                    <p className="text-xs text-zinc-500">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {scriptText ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-left">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Generated script</p>
              <ChatScriptView text={scriptText} />
            </div>
          ) : null}

          {phase === "done" || phase === "failed" ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={onReset}>{phase === "done" ? "Back to dashboard" : "Try again on dashboard"}</Button>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[1.5rem] bg-zinc-950">
          {phase === "done" && previewUrl ? (
            outputType === "image" ? (
              <ImageWithEdit src={previewUrl} alt="" className="aspect-[9/16] w-full" imgClassName="aspect-[9/16] w-full bg-zinc-950 object-cover" />
            ) : (
              <video
                controls
                playsInline
                src={previewUrl}
                className="aspect-[9/16] w-full bg-zinc-950 object-cover"
              />
            )
          ) : (
            <div className="flex aspect-[9/16] flex-col items-center justify-center gap-3 p-6 text-center text-zinc-400">
              {phase === "failed" ? (
                <>
                  <XCircle className="h-8 w-8 text-red-400" />
                  <p className="text-sm text-zinc-300">Preview unavailable</p>
                </>
              ) : (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  <p className="text-sm text-zinc-300">
                    {outputType === "image"
                      ? "Generating your image..."
                      : phase === "starting"
                        ? "Preparing your script..."
                        : "Rendering your video..."}
                  </p>
                  {jobStatus ? <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">{jobStatus}</p> : null}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
