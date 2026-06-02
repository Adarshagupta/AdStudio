"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GenerationPhase } from "@/hooks/useGenerationJob";
import type { GenerationJobStatus } from "@/lib/generation-client";
import { cn } from "@/lib/utils";

const steps = [
  { id: "script", label: "Writing script", description: "Turning your brief into a usable ad script." },
  { id: "video", label: "Rendering video", description: "Generating the final UGC cut with xAI." },
  { id: "done", label: "Ready to review", description: "Your ad is ready to preview and export." },
] as const;

function stepState(stepId: (typeof steps)[number]["id"], phase: GenerationPhase) {
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
  phase,
  jobStatus,
  scriptText,
  videoUrl,
  error,
  onReset,
}: {
  generationId: string;
  phase: GenerationPhase;
  jobStatus?: GenerationJobStatus;
  scriptText?: string;
  videoUrl?: string;
  error?: string;
  onReset: () => void;
}) {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] md:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-zinc-900">
              {phase === "done" ? "Your ad is ready" : phase === "failed" ? "Generation failed" : "Creating your ad"}
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
              const state = stepState(step.id, phase);

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
            <div className="rounded-2xl bg-zinc-50 p-4 text-left">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Generated script</p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {scriptText}
              </pre>
            </div>
          ) : null}

          {phase === "done" || phase === "failed" ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={onReset}>{phase === "done" ? "Back to dashboard" : "Try again on dashboard"}</Button>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[1.5rem] bg-zinc-950">
          {phase === "done" && videoUrl ? (
            <video
              controls
              playsInline
              src={videoUrl}
              className="aspect-[9/16] w-full bg-zinc-950 object-cover"
            />
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
                    {phase === "starting" ? "Preparing your script..." : "Rendering your video..."}
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
