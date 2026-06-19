"use client";

import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { useNotificationContext } from "@/components/layout/NotificationProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationDto } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationDto;
  onRead: (id: string) => void;
}) {
  const content = (
    <div className="flex w-full items-start gap-2">
      <span
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          item.readAt ? "bg-transparent" : "bg-violet-500",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-zinc-500 dark:text-zinc-400">{item.message}</p>
        <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">{formatRelativeTime(item.createdAt)}</p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <DropdownMenuItem
        asChild
        className="cursor-pointer rounded-lg px-2 py-2 focus:bg-zinc-50 dark:focus:bg-zinc-800"
        onSelect={() => {
          if (!item.readAt) void onRead(item.id);
        }}
      >
        <Link href={item.href}>{content}</Link>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      className="cursor-pointer rounded-lg px-2 py-2 focus:bg-zinc-50 dark:focus:bg-zinc-800"
      onSelect={() => {
        if (!item.readAt) void onRead(item.id);
      }}
    >
      {content}
    </DropdownMenuItem>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, loaded, connected, markRead, markAllRead } =
    useNotificationContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="icon" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          {!connected && loaded ? (
            <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" title="Reconnecting…" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl border border-border/80 p-2">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {!loaded ? (
          <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">You&apos;re all caught up.</p>
        ) : (
          <div className="max-h-80 space-y-0.5 overflow-y-auto">
            {notifications.map((item) => (
              <NotificationRow key={item.id} item={item} onRead={markRead} />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
