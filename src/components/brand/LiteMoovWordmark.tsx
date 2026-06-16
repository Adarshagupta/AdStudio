import { cn } from "@/lib/utils";

const WORDMARK_LIGHT = [
  { char: "L", color: "#0B1220" },
  { char: "i", color: "#0B1220" },
  { char: "t", color: "#0B1220" },
  { char: "e", color: "#0B1220" },
  { char: "m", color: "#9333EA" },
  { char: "o", color: "#6366F1" },
  { char: "o", color: "#3B82F6" },
  { char: "v", color: "#38BDF8" },
] as const;

const WORDMARK_ON_DARK = [
  { char: "L", color: "#F8FAFC" },
  { char: "i", color: "#F8FAFC" },
  { char: "t", color: "#F8FAFC" },
  { char: "e", color: "#F8FAFC" },
  { char: "m", color: "#C4B5FD" },
  { char: "o", color: "#A5B4FC" },
  { char: "o", color: "#93C5FD" },
  { char: "v", color: "#67E8F9" },
] as const;

const sizeClasses = {
  sm: "text-sm leading-none",
  md: "text-base leading-none",
  lg: "text-xl leading-none md:text-2xl",
  xl: "text-[1.35rem] leading-none lg:text-[1.65rem]",
} as const;

type LiteMoovWordmarkProps = {
  className?: string;
  size?: keyof typeof sizeClasses;
  /** Use on dark / gradient backgrounds so “Lite” stays readable. */
  tone?: "light" | "dark";
};

export function LiteMoovWordmark({
  className,
  size = "md",
  tone = "light",
}: LiteMoovWordmarkProps) {
  const letters = tone === "dark" ? WORDMARK_ON_DARK : WORDMARK_LIGHT;

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-wordmark font-bold tracking-[-0.03em]",
        sizeClasses[size],
        className,
      )}
      aria-label="LiteMoov"
    >
      {letters.map((letter, index) => (
        <span key={`${letter.char}-${index}`} style={{ color: letter.color }}>
          {letter.char}
        </span>
      ))}
    </span>
  );
}
