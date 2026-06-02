import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneFrame } from "@/components/create/PhoneFrame";
import { cn } from "@/lib/utils";

export type PreviewStatus = "idle" | "queued" | "generating" | "done" | "failed";

const statusCopy: Record<PreviewStatus, string> = {
  idle: "Idle",
  queued: "Queued",
  generating: "Generating",
  done: "Completed",
  failed: "Failed",
};

export function PreviewPanel({
  status,
  isLoading,
  jobId,
  videoUrl,
  scriptText,
  error,
}: {
  status: PreviewStatus;
  isLoading: boolean;
  jobId?: string;
  videoUrl?: string;
  scriptText?: string;
  error?: string;
}) {
  const isActive = status === "queued" || status === "generating";

  return (
    <Card className="sticky top-24 space-y-4 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Live preview</h2>
          <p className="text-xs text-muted-foreground">9:16 output frame</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isActive && "text-amber-600",
            status === "done" && "text-green-600",
            status === "failed" && "text-red-500",
          )}
        >
          {status === "done" ? <CheckCircle2 className="h-4 w-4" /> : null}
          {isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {status === "idle" ? <CircleDashed className="h-4 w-4" /> : null}
          {statusCopy[status]}
        </div>
      </div>
      <PhoneFrame>
        {isLoading ? (
          <div className="h-full space-y-4 bg-zinc-900 p-5">
            <Skeleton className="h-10 w-24 bg-zinc-800" />
            <Skeleton className="h-64 w-full bg-zinc-800" />
            <Skeleton className="h-16 w-full bg-zinc-800" />
          </div>
        ) : status === "done" && videoUrl ? (
          <video
            controls
            playsInline
            src={videoUrl}
            className="h-full w-full bg-zinc-950 object-cover"
            aria-label="Generated video preview"
          />
        ) : (
          <div className="flex h-full flex-col justify-between bg-zinc-900 p-5 text-zinc-100">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Preview</span>
              <span>9:16</span>
            </div>
            <div className="space-y-3">
              <div className="mx-auto flex h-32 w-32 items-end justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                <div className="h-20 w-16 rounded-t-full bg-purple-100" />
              </div>
              <div className="space-y-2">
                <div className="h-3 rounded-full bg-zinc-700" />
                <div className="mx-auto h-3 w-2/3 rounded-full bg-zinc-700" />
              </div>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-950/40 p-3 text-center text-xs text-zinc-300">
              {error
                ? error
                : jobId
                  ? `Job ${jobId.slice(0, 8)}${scriptText ? " with generated script" : ""}`
                  : "Ready for generation"}
            </div>
          </div>
        )}
      </PhoneFrame>
    </Card>
  );
}
