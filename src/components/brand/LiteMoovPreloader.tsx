import { LiteMoovWordmark } from "@/components/brand/LiteMoovWordmark";
import { cn } from "@/lib/utils";

export type LiteMoovPreloaderProps = {
  /** Optional line below the wordmark (e.g. "Studio"). */
  subtitle?: string;
  /** Secondary status line (e.g. workspace name). */
  message?: string;
  /** @deprecated Prefer `variant`. */
  fullscreen?: boolean;
  /** `shell` keeps the sidebar visible; `fullscreen` covers the viewport. */
  variant?: "inline" | "shell" | "fullscreen";
  className?: string;
};

export function LiteMoovPreloader({
  subtitle,
  message,
  fullscreen = false,
  variant,
  className,
}: LiteMoovPreloaderProps) {
  const resolvedVariant = variant ?? (fullscreen ? "fullscreen" : "inline");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-[#fcfcfc]",
        resolvedVariant === "fullscreen" && "fixed inset-0 z-[100] h-dvh w-screen",
        resolvedVariant === "shell" && "min-h-[calc(100dvh-5rem)] w-full",
        resolvedVariant === "inline" && "min-h-[50vh] w-full",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={subtitle ? `Loading ${subtitle}` : "Loading LiteMoov"}
    >
      <div className="litemoov-preloader flex flex-col items-center gap-2.5">
        <LiteMoovWordmark size="xl" />
        {subtitle ? (
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.42em] text-zinc-400">
            {subtitle}
          </p>
        ) : null}
        <div className={cn("h-1 w-20 overflow-hidden rounded-full bg-zinc-200/90", subtitle ? "mt-5" : "mt-6")}>
          <div className="litemoov-preloader-bar h-full w-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-400" />
        </div>
        {message ? (
          <p className="mt-5 max-w-[240px] truncate text-center text-sm text-zinc-500">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
