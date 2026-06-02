"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Workflow } from "lucide-react";

import { getStudioProNavState } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function StudioProHeaderStatus() {
  const pathname = usePathname();
  const { isStudioPro, isStudioSession, modeLabel } = getStudioProNavState(pathname);

  return (
    <Link
      href="/studio-pro"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        isStudioPro
          ? "bg-purple-50 text-purple-900 ring-1 ring-purple-100"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
      )}
    >
      <Workflow className={cn("h-4 w-4 shrink-0", isStudioPro && "text-purple-700")} />
      <span>{modeLabel}</span>
      {isStudioSession ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-purple-500" aria-hidden />
      ) : null}
    </Link>
  );
}
