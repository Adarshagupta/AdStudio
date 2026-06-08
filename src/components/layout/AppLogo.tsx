import Link from "next/link";

import { AuthLionIllustration } from "@/components/auth/AuthLionIllustration";
import { cn } from "@/lib/utils";

export function AppLogo({
  variant = "full",
  className,
}: {
  variant?: "full" | "mark";
  className?: string;
}) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg transition hover:opacity-90",
        className,
      )}
      aria-label="Ad Studio home"
    >
      <AuthLionIllustration className="h-7 w-7 shrink-0" />
      {variant === "full" ? (
        <span className="truncate font-display text-sm font-bold tracking-tight text-zinc-900">
          Ad Studio
        </span>
      ) : null}
    </Link>
  );
}
