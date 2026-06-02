"use client";

import Link from "next/link";
import { Bell, ChevronDown, Wallet } from "lucide-react";

import { StudioProHeaderStatus } from "@/components/layout/StudioProHeaderStatus";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasWorkspacePermission } from "@/lib/permissions";

export function Topbar({
  user,
  workspace,
}: {
  user: {
    name: string | null;
    email: string;
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  workspace: {
    name: string;
    creditsRemaining: number;
  };
}) {
  const canManageTeam = hasWorkspacePermission(user, "manageTeam");
  const canManageIntegrations = hasWorkspacePermission(user, "manageIntegrations");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 bg-[#fcfcfc]/90 px-4 backdrop-blur-md md:px-8">
      <StudioProHeaderStatus />
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="hidden h-9 max-w-[180px] justify-between gap-2 px-3 sm:inline-flex">
              <span className="truncate text-sm text-zinc-600">{workspace.name}</span>
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-0 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
            <DropdownMenuItem>{workspace.name}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/email-preferences">Email preferences</Link>
            </DropdownMenuItem>
            {canManageIntegrations ? (
              <DropdownMenuItem asChild>
                <Link href="/settings/integrations">Connected accounts</Link>
              </DropdownMenuItem>
            ) : null}
            {canManageTeam ? (
              <DropdownMenuItem asChild>
                <Link href="/settings/members">Members</Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem>{user.email}</DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" className="hidden lg:inline-flex">
          {workspace.creditsRemaining} credits
        </Button>
        <Button variant="icon" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </Button>
        <Button variant="icon" size="icon" aria-label="Billing">
          <Wallet className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9 bg-zinc-100">
          <AvatarFallback className="bg-zinc-100 text-xs text-zinc-700">
            {getInitials(user.name, user.email)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "User";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
