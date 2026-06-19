import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "text-sm leading-none",
  md: "text-base leading-none",
  lg: "text-xl leading-none md:text-2xl",
  xl: "text-[1.35rem] leading-none lg:text-[1.65rem]",
} as const;

type LiteMoovWordmarkProps = {
  className?: string;
  size?: keyof typeof sizeClasses;
  /** `auto` uses CSS dark mode (works on preloaders before hydration). `dark` = light letters on dark bg. */
  tone?: "light" | "dark" | "auto";
};

const letterTone = {
  lite: {
    light: "text-[#0B1220]",
    dark: "text-slate-50",
    auto: "text-[#0B1220] dark:text-slate-50",
  },
  m: {
    light: "text-purple-600",
    dark: "text-violet-300",
    auto: "text-purple-600 dark:text-violet-300",
  },
  o1: {
    light: "text-indigo-600",
    dark: "text-indigo-300",
    auto: "text-indigo-600 dark:text-indigo-300",
  },
  o2: {
    light: "text-blue-500",
    dark: "text-blue-300",
    auto: "text-blue-500 dark:text-blue-300",
  },
  v: {
    light: "text-sky-400",
    dark: "text-cyan-300",
    auto: "text-sky-400 dark:text-cyan-300",
  },
} as const;

function toneClass(slot: keyof typeof letterTone, tone: "light" | "dark" | "auto") {
  if (tone === "auto") return letterTone[slot].auto;
  return tone === "dark" ? letterTone[slot].dark : letterTone[slot].light;
}

export function LiteMoovWordmark({
  className,
  size = "md",
  tone = "auto",
}: LiteMoovWordmarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-wordmark font-bold tracking-[-0.03em]",
        sizeClasses[size],
        className,
      )}
      aria-label="LiteMoov"
    >
      <span className={toneClass("lite", tone)}>Lite</span>
      <span className={toneClass("m", tone)}>m</span>
      <span className={toneClass("o1", tone)}>o</span>
      <span className={toneClass("o2", tone)}>o</span>
      <span className={toneClass("v", tone)}>v</span>
    </span>
  );
}
