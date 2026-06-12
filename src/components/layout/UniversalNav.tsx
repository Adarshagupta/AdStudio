"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { useLargeScreen } from "@/hooks/useLargeScreen";
import {
  isNavItemActive,
  isNavSideActionActive,
  universalNavGroups,
  type NavItem,
} from "@/lib/navigation";
import { hasWorkspacePermission, type WorkspaceRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function filterNavItems(
  items: NavItem[],
  user: { role: WorkspaceRole; permissions?: unknown },
  isLargeScreen: boolean | null,
) {
  return items.filter((item) => {
    if (item.permission && !hasWorkspacePermission(user, item.permission)) return false;
    if (item.largeScreenOnly && isLargeScreen === false) return false;
    return true;
  });
}

function NavSideActionButton({
  action,
  pathname,
  onNavigate,
  compact = false,
}: {
  action: NonNullable<NavItem["sideAction"]>;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const SideIcon = action.icon;
  const isSideActive = isNavSideActionActive(pathname, action);

  return (
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
      <Link
        href={action.href}
        prefetch
        title={action.label}
        aria-label={action.label}
        onClick={onNavigate}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md transition-colors duration-150",
          compact ? "h-9 w-9" : "mr-1 h-7 w-7",
          isSideActive
            ? "bg-purple-100 text-purple-700"
            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
        )}
      >
        <SideIcon className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />
      </Link>
    </motion.div>
  );
}

export function UniversalNav({
  className,
  user,
  collapsed = false,
  onNavigate,
}: {
  className?: string;
  user: {
    role: WorkspaceRole;
    permissions?: unknown;
  };
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isLargeScreen = useLargeScreen();

  const visibleItems = universalNavGroups.flatMap((group) =>
    filterNavItems(group.items, user, isLargeScreen),
  );

  if (collapsed) {
    return (
      <nav className={cn("flex flex-col items-center gap-0.5", className)}>
        {visibleItems.map((item) => {
          const isActive = isNavItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <div key={item.label} className="flex flex-col items-center gap-0.5">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Link
                  href={item.href}
                  prefetch
                  title={item.label}
                  aria-label={item.label}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150",
                    isActive
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </Link>
              </motion.div>
              {item.sideAction ? (
                <NavSideActionButton
                  action={item.sideAction}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  compact
                />
              ) : null}
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className={cn("space-y-6", className)}>
      {universalNavGroups.map((group) => {
        const items = filterNavItems(group.items, user, isLargeScreen);

        if (items.length === 0) {
          return null;
        }

        return (
          <div key={group.label}>
            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = isNavItemActive(pathname, item);
                const Icon = item.icon;

                if (item.sideAction) {
                  return (
                    <motion.div
                      key={item.label}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "group flex items-center rounded-lg transition-colors duration-150",
                        isActive ? "bg-zinc-100" : "hover:bg-zinc-50",
                      )}
                    >
                      <Link
                        href={item.href}
                        prefetch
                        onClick={onNavigate}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-sm",
                          isActive
                            ? "font-medium text-zinc-900"
                            : "text-zinc-600 group-hover:text-zinc-900",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive
                              ? "text-zinc-900"
                              : "text-zinc-600 group-hover:text-zinc-800",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                      <NavSideActionButton
                        action={item.sideAction}
                        pathname={pathname}
                        onNavigate={onNavigate}
                      />
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.label}
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href={item.href}
                      prefetch
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150",
                        isActive
                          ? "bg-zinc-100 font-medium text-zinc-900"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive
                            ? "text-zinc-900"
                            : "text-zinc-600 group-hover:text-zinc-800",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
