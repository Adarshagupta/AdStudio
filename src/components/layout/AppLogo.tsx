import Link from "next/link";

import { LiteMoovWordmark } from "@/components/brand/LiteMoovWordmark";
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
      aria-label="LiteMoov home"
    >
      <AuthLionIllustration className="h-7 w-7 shrink-0" />
      {variant === "full" ? (
        <LiteMoovWordmark size="sm" className="truncate" />
      ) : null}
    </Link>
  );
}
