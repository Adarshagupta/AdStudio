"use client";

import { useState } from "react";
import { Image as ImageIcon, Play, Video } from "lucide-react";

import type { TemplateSampleOutput } from "@/lib/studio-pro/template-sample-types";
import { cn } from "@/lib/utils";

export function StudioTemplateSampleGallery({
  samples,
  className,
}: {
  samples: TemplateSampleOutput[];
  className?: string;
}) {
  const [activeId, setActiveId] = useState(samples[0]?.id ?? "");

  if (samples.length === 0) {
    return null;
  }

  const activeSample = samples.find((sample) => sample.id === activeId) ?? samples[0];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950">
        {activeSample.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeSample.url}
            alt={activeSample.nodeTitle}
            className="aspect-video w-full object-contain"
          />
        ) : (
          <video
            key={activeSample.url}
            src={activeSample.url}
            controls
            playsInline
            className="aspect-video w-full bg-black object-contain"
          />
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">{activeSample.nodeTitle}</p>
        <p className="text-xs text-zinc-500">
          Sample {activeSample.type} from this template&apos;s generations
        </p>
      </div>

      {samples.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => setActiveId(sample.id)}
              className={cn(
                "relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border transition",
                activeId === sample.id
                  ? "border-purple-500 ring-2 ring-purple-200"
                  : "border-zinc-200 hover:border-zinc-300",
              )}
            >
              {sample.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sample.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-white">
                  <Video className="h-5 w-5" />
                </div>
              )}
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                {sample.type === "image" ? (
                  <ImageIcon className="inline h-3 w-3" />
                ) : (
                  <Play className="inline h-3 w-3" />
                )}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
