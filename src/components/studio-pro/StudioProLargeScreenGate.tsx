"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Monitor, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLargeScreen } from "@/hooks/useLargeScreen";
import { STUDIO_PRO_MIN_WIDTH_PX } from "@/lib/layout/breakpoints";

export function StudioProLargeScreenGate({ children }: { children: ReactNode }) {
  const isLargeScreen = useLargeScreen();

  if (isLargeScreen === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200" />
      </div>
    );
  }

  if (!isLargeScreen) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-12">
        <div className="max-w-md rounded-3xl border border-zinc-200 bg-white px-8 py-10 text-center shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50">
            <Monitor className="h-7 w-7 text-purple-600" />
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-medium text-zinc-600">
            <Workflow className="h-3.5 w-3.5" />
            Studio Pro
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-zinc-900">Desktop only</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Studio Pro needs a large screen ({STUDIO_PRO_MIN_WIDTH_PX}px or wider) for the node canvas and
            toolbar. Open this on a laptop or desktop to continue.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
