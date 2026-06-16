"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NotificationProvider } from "@/components/layout/NotificationProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  SIDEBAR_INSET_COLLAPSED_CLASS,
  SIDEBAR_INSET_EXPANDED_CLASS,
} from "@/components/layout/sidebar-constants";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "app-sidebar-collapsed";

function isDashboardRoute(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isChatRoute(pathname: string) {
  return pathname.startsWith("/dashboard/chat");
}

export function ShellLayout({
  children,
  user,
  workspace,
  userWorkspaces = [],
  fullWidth = false,
  hideTopbar = false,
}: {
  children: ReactNode;
  user: {
    name: string | null;
    email: string;
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  workspace: {
    id: string;
    name: string;
    plan: string;
    creditsRemaining: number;
  };
  userWorkspaces?: Array<{ id: string; name: string }>;
  fullWidth?: boolean;
  hideTopbar?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isDashboardRoute(pathname)) {
      setCollapsed(false);
      return;
    }

    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "1") setCollapsed(true);
    else if (stored === "0") setCollapsed(false);
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleCollapsedChange(next: boolean) {
    setCollapsed(next);
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
  }

  const insetClass = collapsed ? SIDEBAR_INSET_COLLAPSED_CLASS : SIDEBAR_INSET_EXPANDED_CLASS;
  const chatLayout = isChatRoute(pathname) || (fullWidth && hideTopbar);
  const showTopbar = !chatLayout && !hideTopbar;

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-[#fafafa]">
        <Sidebar
          user={user}
          workspace={workspace}
          userWorkspaces={userWorkspaces}
          collapsed={collapsed}
          onCollapsedChange={handleCollapsedChange}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "min-h-screen transition-[padding] duration-200",
            insetClass,
            chatLayout && "flex h-screen flex-col overflow-hidden",
          )}
        >
          {showTopbar ? (
            <Topbar
              user={user}
              workspace={workspace}
              onOpenMobileSidebar={() => setMobileOpen(true)}
            />
          ) : null}
          <main
            className={
              chatLayout
                ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                : fullWidth
                  ? "flex h-[calc(100vh-4rem)] flex-col overflow-hidden"
                  : "mx-auto max-w-6xl px-4 pb-10 pt-2 md:px-8"
            }
          >
            {children}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
