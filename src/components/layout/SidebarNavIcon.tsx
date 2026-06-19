"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SidebarIconMotion = "bob" | "sway" | "pulse" | "sparkle";

const motionByHref: Record<string, SidebarIconMotion> = {
  "/dashboard": "bob",
  "/studio-pro": "sway",
  "/studio/image": "pulse",
  "/library": "bob",
  "/assets": "pulse",
  "/analytics": "pulse",
  "/settings/members": "pulse",
  "/settings/integrations": "sway",
};

export function getSidebarIconMotion(href: string, label?: string): SidebarIconMotion {
  if (label === "Projects") return "pulse";
  return motionByHref[href] ?? "bob";
}

export function SidebarNavIcon({
  icon: Icon,
  href,
  label,
  isActive,
  className,
  delayIndex = 0,
}: {
  icon: LucideIcon;
  href: string;
  label?: string;
  isActive: boolean;
  className?: string;
  delayIndex?: number;
}) {
  const motion = getSidebarIconMotion(href, label);

  return (
    <span
      className={cn(
        "sidebar-nav-icon inline-flex shrink-0 items-center justify-center",
        `sidebar-nav-icon--${motion}`,
        isActive && "sidebar-nav-icon--active",
        className,
      )}
      style={{ animationDelay: `${(delayIndex % 6) * 0.12}s` }}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
