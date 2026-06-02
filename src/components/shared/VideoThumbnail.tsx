import type { GenerationFormat } from "@prisma/client";
import { cn } from "@/lib/utils";

const formatTone: Record<GenerationFormat, {
  canvas: string;
  accent: string;
  soft: string;
  text: string;
  label: string;
}> = {
  UGC: {
    canvas: "bg-zinc-950",
    accent: "bg-purple-400",
    soft: "bg-purple-100",
    text: "text-purple-950",
    label: "UGC",
  },
  BRAIN_ROT: {
    canvas: "bg-zinc-900",
    accent: "bg-amber-300",
    soft: "bg-amber-100",
    text: "text-amber-950",
    label: "Hook",
  },
  STATIC: {
    canvas: "bg-zinc-100",
    accent: "bg-sky-300",
    soft: "bg-sky-100",
    text: "text-sky-950",
    label: "Ad",
  },
  REVIEW: {
    canvas: "bg-zinc-950",
    accent: "bg-emerald-300",
    soft: "bg-emerald-100",
    text: "text-emerald-950",
    label: "Review",
  },
};

export function VideoThumbnail({
  type,
  index = 0,
  compact = false,
  className,
}: {
  type: GenerationFormat;
  index?: number;
  compact?: boolean;
  className?: string;
}) {
  const tone = formatTone[type];
  const isLight = type === "STATIC";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        compact ? "h-14 w-10" : "aspect-[9/16]",
        tone.canvas,
        className,
      )}
    >
      <div className={cn("absolute inset-x-1.5 top-1.5 flex items-center justify-between", compact && "hidden")}>
        <div
          className={cn(
            "rounded-full px-2 py-1 text-[10px] font-medium",
            tone.soft,
            tone.text,
          )}
        >
          {tone.label}
        </div>
        <div className={cn("h-6 w-6 rounded-full", tone.accent)} />
      </div>

      {compact ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 p-1">
          <div className={cn("rounded-full px-1 py-0.5 text-[8px] font-medium leading-none", tone.soft, tone.text)}>
            {tone.label}
          </div>
          <div className={cn("h-4 w-4 rounded-full", tone.accent)} />
          <div className={cn("h-1 w-6 rounded-full", tone.soft)} />
        </div>
      ) : (
        <>
      <div className="absolute inset-x-5 top-[17%]">
        <div
          className={cn(
            "mx-auto flex aspect-square w-24 items-end justify-center overflow-hidden rounded-full",
            isLight ? "bg-white shadow-inner" : "bg-zinc-800",
          )}
        >
          <div className={cn("h-16 w-12 rounded-t-full", tone.soft)} />
        </div>
      </div>

      <div
        className={cn(
          "absolute inset-x-4 bottom-[23%] rounded-xl p-3",
          isLight ? "bg-white/95 shadow-sm" : "bg-zinc-900/95",
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("h-8 w-8 rounded-md", tone.accent)} />
          <div className="flex-1 space-y-1.5">
            <div className={cn("h-2 rounded-full", isLight ? "bg-zinc-300" : "bg-zinc-700")} />
            <div
              className={cn(
                "h-2 w-2/3 rounded-full",
                isLight ? "bg-zinc-200" : "bg-zinc-800",
              )}
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-4 space-y-2">
        <div
          className={cn(
            "mx-auto h-7 w-[86%] rounded-md px-3 py-2",
            isLight ? "bg-zinc-900" : "bg-white",
          )}
        >
          <div className={cn("h-1.5 rounded-full", tone.accent)} />
        </div>
        {!compact ? (
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>0{index + 1}</span>
            <span>00:{36 + index}</span>
          </div>
        ) : null}
      </div>
        </>
      )}
    </div>
  );
}
