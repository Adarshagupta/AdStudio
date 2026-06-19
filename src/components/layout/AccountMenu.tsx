"use client";

import Link from "next/link";
import {
  ChevronDown,
  CreditCard,
  Link2,
  LogOut,
  Settings,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export function AccountMenu({
  user,
  creditsRemaining,
}: {
  user: {
    name: string | null;
    email: string;
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  creditsRemaining: number;
}) {
  const displayName = user.name?.trim() || user.email.split("@")[0] || "Account";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-full px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800">
            <AvatarFallback className="bg-zinc-100 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[140px] truncate text-sm font-medium text-zinc-700 dark:text-zinc-200 md:inline">
            {displayName}
          </span>
          <ChevronDown className="hidden h-4 w-4 shrink-0 text-zinc-400 md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-2xl border border-border/80 p-1 shadow-[0_8px_30px_rgba(15,23,42,0.08)] dark:shadow-black/40"
      >
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayName}</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{creditsRemaining} credits</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="flex cursor-pointer items-center gap-2">
            <User className="h-4 w-4 text-zinc-500" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex cursor-pointer items-center gap-2">
            <Settings className="h-4 w-4 text-zinc-500" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/integrations" className="flex cursor-pointer items-center gap-2">
            <Link2 className="h-4 w-4 text-zinc-500" />
            Integrations
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing" className="flex cursor-pointer items-center gap-2">
            <CreditCard className="h-4 w-4 text-zinc-500" />
            Billing & upgrade
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="flex cursor-pointer items-center gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
