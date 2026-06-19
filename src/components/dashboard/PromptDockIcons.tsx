import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

const base = "h-[18px] w-[18px] shrink-0";

/** Film strip + play — video creation */
export function PromptVideoIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn(base, className)} aria-hidden {...props}>
      <rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 4v12M13.5 4v12" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />
      <path
        d="M9.2 8.4 12.4 10 9.2 11.6V8.4Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Polaroid frame — image creation */
export function PromptImageIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn(base, className)} aria-hidden {...props}>
      <rect x="3" y="3.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="5.5" width="10" height="7" rx="1" fill="currentColor" opacity="0.18" />
      <circle cx="7.2" cy="7.4" r="1.1" fill="currentColor" opacity="0.75" />
      <path
        d="M5.5 11.5 8.2 9.2 10.4 10.8 12.2 8.5 14.5 11.5"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dashed reference frame — attach visual */
export function PromptReferenceIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn(base, className)} aria-hidden {...props}>
      <rect
        x="3.5"
        y="3.5"
        width="13"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="2.6 2.2"
      />
      <path d="M10 6.5v7M6.5 10h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Price tag + link dot — product URL */
export function PromptProductIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn(base, className)} aria-hidden {...props}>
      <path
        d="M4.5 9.5 9.5 4.5h4l2 2v4.5l-5 5-6-6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12.2" cy="7.2" r="0.9" fill="currentColor" />
      <circle cx="15.2" cy="14.2" r="2.1" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M13.8 14.2h2.8M15.2 12.8v2.8"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Stacked chat threads — session history */
export function PromptChatHistoryIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn(base, className)} aria-hidden {...props}>
      <path
        d="M3.5 11.5c0-2.76 2.24-5 5-5h.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M16.5 8.5c0 2.76-2.24 5-5 5h-.5l-2 2v-2.8"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.3" cy="9.8" r="0.75" fill="currentColor" />
      <circle cx="9.2" cy="9.8" r="0.75" fill="currentColor" opacity="0.65" />
      <circle cx="12.1" cy="9.8" r="0.75" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/** Spark + send arrow — create action */
export function PromptCreateIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn(base, className)} aria-hidden {...props}>
      <path
        d="M4.2 10.2 15.2 5.2 9.8 14.8l1.1-3.4L15.2 5.2l-3.8 3.6-7.2 1.4Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <path
        d="m14.2 3.6 1.1 1.1M15.3 3.6v1.1M14.2 4.7h1.1"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type PromptDockTone = "video" | "image" | "reference" | "product" | "history" | "create";

export const promptDockToneStyles: Record<
  PromptDockTone,
  { idle: string; active: string; ring: string }
> = {
  video: {
    idle: "text-violet-600 hover:bg-violet-500/10 dark:text-violet-400",
    active: "bg-violet-500/15 text-violet-700 shadow-sm dark:bg-violet-500/20 dark:text-violet-300",
    ring: "ring-violet-500/30",
  },
  image: {
    idle: "text-sky-600 hover:bg-sky-500/10 dark:text-sky-400",
    active: "bg-sky-500/15 text-sky-700 shadow-sm dark:bg-sky-500/20 dark:text-sky-300",
    ring: "ring-sky-500/30",
  },
  reference: {
    idle: "text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400",
    active: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    ring: "ring-emerald-500/30",
  },
  product: {
    idle: "text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
    active: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    ring: "ring-amber-500/30",
  },
  history: {
    idle: "text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400",
    active: "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
    ring: "ring-indigo-500/30",
  },
  create: {
    idle: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    active: "bg-primary text-primary-foreground",
    ring: "ring-primary/40",
  },
};

export const PromptDockIconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    tone: PromptDockTone;
    active?: boolean;
    size?: "sm" | "md";
    children: ReactNode;
  }
>(function PromptDockIconButton(
  { tone, active = false, size = "md", className, children, ...props },
  ref,
) {
  const styles = promptDockToneStyles[tone];
  const sizeClass =
    tone === "create"
      ? "h-9 w-9"
      : size === "sm"
        ? "h-8 w-8"
        : "h-8 w-8";

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
        "[&_svg:not([class*='animate-spin'])]:h-[18px] [&_svg:not([class*='animate-spin'])]:w-[18px]",
        tone === "create" &&
          "[&_svg:not([class*='animate-spin'])]:h-5 [&_svg:not([class*='animate-spin'])]:w-5",
        sizeClass,
        active ? styles.active : styles.idle,
        active && tone !== "create" && `ring-1 ${styles.ring}`,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
PromptDockIconButton.displayName = "PromptDockIconButton";
