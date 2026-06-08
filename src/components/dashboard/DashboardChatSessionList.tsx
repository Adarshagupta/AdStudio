"use client";

import { ChevronDown, History, MessageSquarePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createChatSessionId,
  createChatSessionRecord,
  deleteChatSession,
  type ChatSessionMeta,
} from "@/lib/dashboard-chat-sessions";
import { cn } from "@/lib/utils";

export function DashboardChatHistoryDropdown({
  sessions,
  activeSessionId,
  onSessionsChange,
  trigger = "header",
  disabled = false,
  onOpenChange,
}: {
  sessions: ChatSessionMeta[];
  activeSessionId?: string;
  onSessionsChange: () => void;
  trigger?: "header" | "icon";
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const activeTitle = sessions.find((item) => item.id === activeSessionId)?.title ?? "Chat history";

  const startNewChat = () => {
    const id = createChatSessionId();
    createChatSessionRecord(id);
    onSessionsChange();
    router.push(`/dashboard/chat/${id}`);
  };

  const openSession = (sessionId: string) => {
    router.push(`/dashboard/chat/${sessionId}`);
  };

  const removeSession = (sessionId: string) => {
    deleteChatSession(sessionId);
    onSessionsChange();

    if (!activeSessionId || sessionId !== activeSessionId) return;

    const remaining = sessions.filter((item) => item.id !== sessionId);
    if (remaining[0]) {
      router.push(`/dashboard/chat/${remaining[0].id}`);
      return;
    }

    const id = createChatSessionId();
    createChatSessionRecord(id);
    router.push(`/dashboard/chat/${id}`);
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger === "icon" ? (
          <Button
            type="button"
            variant="icon"
            size="icon"
            className="h-10 w-10 bg-zinc-50"
            aria-label="Chat history"
            disabled={disabled}
          >
            <History className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="max-w-[min(100%,280px)] gap-1.5 rounded-full px-2.5 font-medium text-zinc-900"
            disabled={disabled}
          >
            <History className="h-4 w-4 shrink-0 text-zinc-500" />
            <span className="truncate">{activeTitle}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1">
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-lg font-medium"
          onSelect={startNewChat}
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-zinc-500">Recent chats</DropdownMenuLabel>
        {sessions.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-zinc-400">No chats yet</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {sessions.map((session) => {
              const active = Boolean(activeSessionId && session.id === activeSessionId);
              return (
                <DropdownMenuItem
                  key={session.id}
                  className={cn(
                    "group cursor-pointer flex-col items-stretch gap-0.5 rounded-lg py-2",
                    active && "bg-purple-50 focus:bg-purple-50",
                  )}
                  onSelect={() => openSession(session.id)}
                >
                  <span className="flex w-full items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-medium",
                          active ? "text-purple-900" : "text-zinc-800",
                        )}
                      >
                        {session.title}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[10px]",
                          active ? "text-purple-600/80" : "text-zinc-400",
                        )}
                      >
                        {formatSessionTime(session.updatedAt)}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      className={cn(
                        "shrink-0 rounded-lg p-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100",
                        active ? "hover:bg-purple-100" : "hover:bg-zinc-200",
                      )}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeSession(session.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatSessionTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
