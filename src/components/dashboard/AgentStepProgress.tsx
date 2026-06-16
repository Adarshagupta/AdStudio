"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, ChevronDown, Wand2 } from "lucide-react";
import type { AgentStep } from "@/lib/dashboard-chat";
import { cn } from "@/lib/utils";

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />;
  return <div className="h-3.5 w-3.5 rounded-full border border-zinc-300" />;
}

function StepLabel({ label }: { label: string }) {
  const labels: Record<string, string> = {
    research: "Research",
    think: "Plan",
    script: "Script",
    image: "Image",
    audio: "Voice",
    video: "Video",
  };
  return <span>{labels[label] ?? label}</span>;
}

function StepRow({ step, isLast }: { step: AgentStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = step.status === "completed";

  return (
    <div className="group flex items-start gap-2">
      <div className="flex flex-col items-center gap-0">
        <StepIcon status={step.status} />
        {!isLast && <div className="mt-1 h-full w-px bg-zinc-200 group-last:hidden" />}
      </div>
      <div className="min-w-0 flex-1 pb-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-left"
        >
          <span className={cn("text-xs", isCompleted ? "text-zinc-700" : "text-zinc-500")}>
            <StepLabel label={step.label} />
          </span>
          {isCompleted && (
            <ChevronDown className={cn("h-3 w-3 text-zinc-400 transition-transform", expanded && "rotate-180")} />
          )}
        </button>

        {expanded && step.assetUrl && (
          <div className="mt-1">
            {step.assetKind === "image" ? (
              <img src={step.assetUrl} alt="" className="h-24 rounded-lg object-cover" />
            ) : step.assetKind === "audio" ? (
              <audio src={step.assetUrl} controls className="h-8 w-full" />
            ) : step.assetKind === "video" ? (
              <video src={step.assetUrl} controls className="h-32 rounded-lg" />
            ) : (
              <p className="text-xs text-zinc-600">{step.output}</p>
            )}
          </div>
        )}

        {step.error && <p className="text-xs text-red-500">{step.error}</p>}
      </div>
    </div>
  );
}

export function AgentStepProgress({ steps }: { steps: AgentStep[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const completed = steps.filter((s) => s.status === "completed").length;

  return (
    <div className="rounded-lg border border-zinc-200/60 bg-zinc-50/50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-1.5">
          <Wand2 className="h-3 w-3 text-zinc-500" />
          <span className="text-xs text-zinc-500">
            {completed}/{steps.length} steps
          </span>
          {/* Animated dots for running */}
          {steps.some((s) => s.status === "running") && (
            <span className="inline-flex gap-0.5">
              <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
            </span>
          )}
        </div>
        <ChevronDown className={cn("h-3 w-3 text-zinc-400 transition-transform", !collapsed && "rotate-180")} />
      </button>

      {!collapsed && (
        <div className="mt-1.5 pl-0.5">
          {steps.map((step, index) => (
            <StepRow key={step.id} step={step} isLast={index === steps.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
