"use client";

import Link from "next/link";
import { ChevronDown, Sparkles, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  AI_TOOLS_APP_LINK,
  AI_TOOLS_COLUMNS,
  AI_TOOLS_FEATURED_MODELS,
  type NavBadge,
} from "@/lib/ai-tools-nav";
import { cn } from "@/lib/utils";

type AIToolsNavDropdownProps = {
  variant?: "dark" | "light";
};

function NavBadgePill({ badge }: { badge: NavBadge }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        badge === "hot"
          ? "bg-orange-500/15 text-orange-500"
          : "bg-emerald-500/15 text-emerald-600",
      )}
    >
      {badge}
    </span>
  );
}

export function AIToolsNavDropdown({ variant = "dark" }: AIToolsNavDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isDark = variant === "dark";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-1 transition",
          isDark ? "text-white/95 hover:text-white" : "text-zinc-600 hover:text-zinc-900",
        )}
      >
        AI Tools
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-1/2 top-full z-50 mt-3 w-[min(920px,calc(100vw-2rem))] -translate-x-1/2">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl shadow-violet-950/10">
            <div className="grid gap-0 md:grid-cols-4">
              {AI_TOOLS_COLUMNS.map((column) => (
                <div
                  key={column.title}
                  className="border-b border-zinc-100 p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                    {column.title}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {column.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-violet-50 hover:text-violet-900"
                        >
                          <span>{item.label}</span>
                          {item.badge ? <NavBadgePill badge={item.badge} /> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={column.exploreMoreHref}
                    onClick={() => setOpen(false)}
                    className="mt-3 inline-flex text-xs font-medium text-violet-700 hover:text-violet-900"
                  >
                    Explore More →
                  </Link>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  Models
                </span>
                {AI_TOOLS_FEATURED_MODELS.map((model) => (
                  <Link
                    key={model.label}
                    href={model.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-900"
                  >
                    {model.label}
                    {model.badge ? <NavBadgePill badge={model.badge} /> : null}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
              <div className="flex items-start gap-2">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                <div>
                  <Link
                    href={AI_TOOLS_APP_LINK.href}
                    onClick={() => setOpen(false)}
                    className="text-sm font-medium text-zinc-900 hover:text-violet-700"
                  >
                    {AI_TOOLS_APP_LINK.label}
                  </Link>
                  <p className="text-xs text-zinc-500">{AI_TOOLS_APP_LINK.description}</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Open workspace
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
