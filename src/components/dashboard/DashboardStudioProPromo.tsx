"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

import { StudioProMiniIllustration } from "@/components/dashboard/StudioProMiniIllustration";
import { Button } from "@/components/ui/button";
import { useLargeScreen } from "@/hooks/useLargeScreen";

const STORAGE_KEY = "dashboard-studio-pro-promo-dismissed-at";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const SCROLL_THRESHOLD = 280;

function isPromoDismissed() {
  if (typeof window === "undefined") return true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_MS;
  } catch {
    return false;
  }
}

export function DashboardStudioProPromo() {
  const isLargeScreen = useLargeScreen();
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  const dismiss = useCallback(() => {
    setEntered(false);
    window.setTimeout(() => setOpen(false), 220);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isPromoDismissed()) return;

    let shown = false;

    const maybeShow = () => {
      if (shown || window.scrollY < SCROLL_THRESHOLD) return;
      shown = true;
      setOpen(true);
      requestAnimationFrame(() => setEntered(true));
    };

    window.addEventListener("scroll", maybeShow, { passive: true });
    maybeShow();

    return () => window.removeEventListener("scroll", maybeShow);
  }, []);

  if (isLargeScreen === false || !open) return null;

  return (
    <div
      className={`dashboard-studio-promo fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-[340px] ${
        entered ? "dashboard-studio-promo-enter" : "dashboard-studio-promo-exit"
      }`}
      role="dialog"
      aria-labelledby="dashboard-studio-promo-title"
      aria-describedby="dashboard-studio-promo-desc"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_48px_rgba(15,23,42,0.14)] ring-1 ring-border/60 dark:shadow-black/40">
        <div className="relative p-3 pb-2">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Dismiss Studio Pro suggestion"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <StudioProMiniIllustration />

          <div className="mt-3 pr-6">
            <p id="dashboard-studio-promo-title" className="text-sm font-semibold text-foreground">
              Try Studio Pro
            </p>
            <p id="dashboard-studio-promo-desc" className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Build scripts, images, and video on a visual canvas — wire nodes together and run the full ad pipeline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
          <Button asChild size="sm" className="h-8 flex-1 text-xs">
            <Link href="/studio-pro" onClick={dismiss}>
              Open Studio Pro
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-xs text-zinc-500"
            onClick={dismiss}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
