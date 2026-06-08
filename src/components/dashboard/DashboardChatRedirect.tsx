"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createChatSessionId,
  createChatSessionRecord,
  loadChatSessionIndex,
  migrateLegacyChatStorage,
} from "@/lib/dashboard-chat-sessions";

export function DashboardChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    const query = window.location.search;

    const migrated = migrateLegacyChatStorage();
    if (migrated) {
      router.replace(`/dashboard/chat/${migrated}${query}`);
      return;
    }

    const sessions = loadChatSessionIndex();
    if (sessions[0]) {
      router.replace(`/dashboard/chat/${sessions[0].id}${query}`);
      return;
    }

    const id = createChatSessionId();
    createChatSessionRecord(id);
    router.replace(`/dashboard/chat/${id}${query}`);
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
      Loading chats…
    </div>
  );
}
