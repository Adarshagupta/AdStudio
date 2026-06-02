"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getStudioProNavState,
  isNavItemActive,
  universalNavGroups,
} from "@/lib/navigation";
import { hasWorkspacePermission, type WorkspaceRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function UniversalNav({
  className,
  user,
}: {
  className?: string;
  user: {
    role: WorkspaceRole;
    permissions?: unknown;
  };
}) {
  const pathname = usePathname();
  const studioNav = getStudioProNavState(pathname);

  return (
    <nav className={cn("space-y-7", className)}>
      {universalNavGroups.map((group) => {
        const items = group.items.filter(
          (item) => !item.permission || hasWorkspacePermission(user, item.permission),
        );

        if (items.length === 0) {
          return null;
        }

        return (
          <div key={group.label} className="space-y-1.5">
            <p className="px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = isNavItemActive(pathname, item);
                const isStudioProItem = item.href === "/studio-pro";

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex flex-row items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                      isStudioProItem && studioNav.isStudioPro && isActive
                        ? "bg-purple-50 text-purple-900 ring-1 ring-purple-100"
                        : isActive
                          ? "bg-zinc-100 text-zinc-900"
                          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isStudioProItem && studioNav.isStudioPro && isActive && "text-purple-700",
                        isActive && !(isStudioProItem && studioNav.isStudioPro) && "text-zinc-900",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
