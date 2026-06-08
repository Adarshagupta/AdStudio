"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { AppLogo } from "@/components/layout/AppLogo";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Button } from "@/components/ui/button";

export function Topbar({
  user,
  workspace,
  onOpenMobileSidebar,
}: {
  user: {
    name: string | null;
    email: string;
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  workspace: {
    id: string;
    name: string;
    creditsRemaining: number;
  };
  onOpenMobileSidebar?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-zinc-100/80 bg-[#fafafa]/90 px-4 backdrop-blur-md md:justify-end md:px-8">
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="icon"
          size="icon"
          aria-label="Open navigation"
          onClick={onOpenMobileSidebar}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <AppLogo variant="mark" className="h-9 w-9 items-center justify-center" />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
          <Link href="/settings/billing">{workspace.creditsRemaining.toLocaleString()} credits</Link>
        </Button>
        <NotificationBell />
        <AccountMenu user={user} creditsRemaining={workspace.creditsRemaining} />
      </div>
    </header>
  );
}
