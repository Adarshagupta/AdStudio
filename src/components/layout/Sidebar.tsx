"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Coins, Link2, PanelLeftClose, PanelLeftOpen, Settings, UserPlus, X } from "lucide-react";

import { AppLogo } from "@/components/layout/AppLogo";
import { MembersNavHint } from "@/components/layout/MembersNavHint";
import { UniversalNav } from "@/components/layout/UniversalNav";
import {
  SIDEBAR_COLLAPSED_WIDTH_CLASS,
  SIDEBAR_WIDTH_CLASS,
} from "@/components/layout/sidebar-constants";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { formatPlanLabel, planGenerationLimits } from "@/lib/billing/plans";
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

type WorkspaceUsage = {
  videoMinutesUsed: number;
  imageCountUsed: number;
  premiumCreditsUsed: number;
};

function creditsBarPercent(credits: number) {
  const baseline = 100;
  return Math.min(100, Math.max(credits > 0 ? 8 : 0, (credits / baseline) * 100));
}

function CreditsUsageDropup({
  plan,
  creditsRemaining,
}: {
  plan: string;
  creditsRemaining: number;
}) {
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/workspace/usage")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.usage) {
          setUsage(data.usage);
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const planLimits = planGenerationLimits[plan as keyof typeof planGenerationLimits] ?? planGenerationLimits.FREE;
  const videoPercent = planLimits.videoMinutes === Infinity
    ? 0
    : Math.min(100, ((usage?.videoMinutesUsed ?? 0) / planLimits.videoMinutes) * 100);
  const imagePercent = planLimits.imageCount === Infinity
    ? 0
    : Math.min(100, ((usage?.imageCountUsed ?? 0) / planLimits.imageCount) * 100);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left"
      >
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3 py-2.5 transition-colors hover:bg-zinc-100/60">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-900">Credits</p>
            <span className="text-[11px] text-zinc-500">{formatPlanLabel(plan)}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200/80">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                creditsRemaining <= 5 ? "bg-amber-500" : "bg-zinc-900",
              )}
              style={{ width: `${creditsBarPercent(creditsRemaining)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              <span className="font-medium text-zinc-700">{creditsRemaining}</span> left
            </p>
            <span className="text-[10px] font-medium text-zinc-400">Click for details</span>
          </div>
        </div>
      </button>

      {open && (
        <>
          <div className="absolute inset-x-0 bottom-full mb-1 z-50 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
            <div className="space-y-3">
              {/* Video Minutes */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600">Video time</span>
                  <span className="text-zinc-900 font-medium">
                    {usage?.videoMinutesUsed ?? 0} / {planLimits.videoMinutes === Infinity ? "∞" : `${planLimits.videoMinutes} min`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${videoPercent}%` }}
                  />
                </div>
              </div>

              {/* Images */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600">Images</span>
                  <span className="text-zinc-900 font-medium">
                    {usage?.imageCountUsed ?? 0} / {planLimits.imageCount === Infinity ? "∞" : `${planLimits.imageCount}`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${imagePercent}%` }}
                  />
                </div>
              </div>

              {/* Premium Credits */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600">Premium credits</span>
                  <span className="text-zinc-900 font-medium">{usage?.premiumCreditsUsed ?? 0} used</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${Math.min(100, ((usage?.premiumCreditsUsed ?? 0) / Math.max(1, creditsRemaining + (usage?.premiumCreditsUsed ?? 0))) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-2">
                <Link
                  href="/settings/billing"
                  className="block text-center text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline"
                >
                  Upgrade plan
                </Link>
              </div>
            </div>
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
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
          <CreditsUsageDropup
            plan={workspace.plan}
            creditsRemaining={workspace.creditsRemaining}
          />
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
