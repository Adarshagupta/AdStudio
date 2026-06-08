"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type RefObject } from "react";
import { Coins, Link2, PanelLeftClose, PanelLeftOpen, Settings, UserPlus, X } from "lucide-react";

import { AppLogo } from "@/components/layout/AppLogo";
import { MembersNavHint } from "@/components/layout/MembersNavHint";
import { UniversalNav } from "@/components/layout/UniversalNav";
import {
  SIDEBAR_COLLAPSED_WIDTH_CLASS,
  SIDEBAR_WIDTH_CLASS,
} from "@/components/layout/sidebar-constants";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { formatPlanLabel } from "@/lib/billing/plans";
import { hasWorkspacePermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const footerLinks = [
  {
    href: "/settings/members",
    label: "Members",
    icon: UserPlus,
    permission: "manageTeam" as const,
  },
  {
    href: "/settings/integrations",
    label: "Integrations",
    icon: Link2,
    permission: "manageIntegrations" as const,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

function isFooterLinkActive(pathname: string, href: string) {
  if (href === "/settings/members") {
    return pathname.startsWith("/settings/members");
  }
  if (href === "/settings/integrations") {
    return pathname.startsWith("/settings/integrations");
  }
  if (href === "/settings") {
    return (
      pathname === "/settings" ||
      (pathname.startsWith("/settings/") &&
        !pathname.startsWith("/settings/members") &&
        !pathname.startsWith("/settings/integrations"))
    );
  }
  return pathname.startsWith(href);
}

function creditsBarPercent(credits: number) {
  const baseline = 100;
  return Math.min(100, Math.max(credits > 0 ? 8 : 0, (credits / baseline) * 100));
}

function SidebarFooterLink({
  item,
  pathname,
  collapsed,
  membersAnchorRef,
  onNavigate,
}: {
  item: (typeof footerLinks)[number];
  pathname: string;
  collapsed: boolean;
  membersAnchorRef: RefObject<HTMLAnchorElement>;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const isActive = isFooterLinkActive(pathname, item.href);
  const isMembersLink = item.href === "/settings/members";

  return (
    <Link
      ref={isMembersLink ? membersAnchorRef : undefined}
      href={item.href}
      title={item.label}
      aria-label={item.label}
      onClick={onNavigate}
      className={cn(
        "transition-colors",
        collapsed
          ? cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              isActive
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
            )
          : cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium",
              isActive
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
            ),
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarContent({
  user,
  workspace,
  collapsed,
  onCollapsedChange,
  onNavigate,
  showCloseButton,
  onClose,
}: {
  user: {
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  workspace: {
    id: string;
    name: string;
    plan: string;
    creditsRemaining: number;
  };
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const membersAnchorRef = useRef<HTMLAnchorElement>(null);
  const creditsLow = workspace.creditsRemaining <= 5;

  function toggleCollapsed() {
    onCollapsedChange?.(!collapsed);
  }

  const visibleFooterLinks = footerLinks.filter(
    (item) => !item.permission || hasWorkspacePermission(user, item.permission),
  );

  return (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-zinc-100 py-2",
          collapsed ? "flex-col gap-1 px-1" : "justify-between gap-2 px-3",
        )}
      >
        <AppLogo
          variant={collapsed ? "mark" : "full"}
          className={cn(collapsed && "h-9 w-9 items-center justify-center")}
        />
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        ) : onCollapsedChange ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <WorkspaceSwitcher
        variant="sidebar"
        collapsed={collapsed}
        activeWorkspaceId={workspace.id}
        activeWorkspaceName={workspace.name}
      />

      <div className={cn("flex-1 overflow-y-auto", collapsed ? "px-1 py-2" : "px-3 py-4")}>
        <UniversalNav user={user} collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      <div className={cn("shrink-0 space-y-1.5 border-t border-zinc-100", collapsed ? "p-2" : "p-3")}>
        {collapsed ? (
          <Link
            href="/settings/billing"
            title={`${workspace.creditsRemaining} credits · ${formatPlanLabel(workspace.plan)}`}
            aria-label={`${workspace.creditsRemaining} credits remaining`}
            onClick={onNavigate}
            className={cn(
              "relative mx-auto flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              creditsLow
                ? "text-amber-600 hover:bg-amber-50"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
            )}
          >
            <Coins className="h-4 w-4 shrink-0" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-0.5 text-[9px] font-semibold text-white">
              {workspace.creditsRemaining > 99 ? "99+" : workspace.creditsRemaining}
            </span>
          </Link>
        ) : (
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-zinc-900">Credits</p>
              <span className="text-[11px] text-zinc-500">{formatPlanLabel(workspace.plan)}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200/80">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  creditsLow ? "bg-amber-500" : "bg-zinc-900",
                )}
                style={{ width: `${creditsBarPercent(workspace.creditsRemaining)}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">{workspace.creditsRemaining}</span> left
              </p>
              <Link
                href="/settings/billing"
                onClick={onNavigate}
                className="text-[10px] font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:underline"
              >
                Upgrade
              </Link>
            </div>
          </div>
        )}

        <div
          className={cn(
            "relative",
            collapsed ? "flex flex-col items-center gap-0.5" : "flex items-center gap-1",
          )}
        >
          {visibleFooterLinks.map((item) => (
            <SidebarFooterLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
              membersAnchorRef={membersAnchorRef}
              onNavigate={onNavigate}
            />
          ))}
          {visibleFooterLinks.some((item) => item.href === "/settings/members") ? (
            <MembersNavHint anchorRef={membersAnchorRef} />
          ) : null}
        </div>
      </div>
    </>
  );
}

export function Sidebar({
  user,
  workspace,
  collapsed,
  onCollapsedChange,
  mobileOpen = false,
  onMobileClose,
}: {
  user: {
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  workspace: {
    id: string;
    name: string;
    plan: string;
    creditsRemaining: number;
  };
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-zinc-900/20 backdrop-blur-[2px] md:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[min(288px,88vw)] flex-col overflow-hidden border-r border-zinc-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.16)] transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent
          user={user}
          workspace={workspace}
          collapsed={false}
          onNavigate={onMobileClose}
          showCloseButton
          onClose={onMobileClose}
        />
      </aside>

      <aside
        className={cn(
          "fixed left-3 top-3 bottom-3 z-50 hidden flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md transition-[width] duration-200 md:flex",
          collapsed ? SIDEBAR_COLLAPSED_WIDTH_CLASS : SIDEBAR_WIDTH_CLASS,
        )}
      >
        <SidebarContent
          user={user}
          workspace={workspace}
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
        />
      </aside>
    </>
  );
}
