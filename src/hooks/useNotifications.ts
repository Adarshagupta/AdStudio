"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { notify } from "@/lib/notify";
import type { NotificationDto, NotificationRealtimeEvent } from "@/lib/notifications/types";
import { readJsonResponse } from "@/lib/http/json";

const SSE_RECONNECT_MS = 2000;

function upsertNotification(items: NotificationDto[], next: NotificationDto) {
  const without = items.filter((item) => item.id !== next.id);
  return [next, ...without].slice(0, 40);
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/notifications");
    if (!response.ok) return;

    const data = await readJsonResponse<{
      notifications: NotificationDto[];
      unreadCount: number;
    }>(response);

    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
    setLoaded(true);
  }, []);

  const markRead = useCallback(async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
    if (!response.ok) return;

    const data = await readJsonResponse<{ unreadCount: number }>(response);
    setNotifications((items) =>
      items.map((item) =>
        item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    setUnreadCount(data.unreadCount ?? 0);
  }, []);

  const markAllRead = useCallback(async () => {
    const response = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!response.ok) return;

    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function handleEvent(event: NotificationRealtimeEvent) {
      if (event.type === "hello") {
        setUnreadCount(event.unreadCount);
        setConnected(true);
        return;
      }

      if (event.type === "unread_count") {
        setUnreadCount(event.unreadCount);
        return;
      }

      if (event.type === "notification") {
        setNotifications((items) => upsertNotification(items, event.notification));
        setUnreadCount(event.unreadCount);
        notify.info(event.notification.title, {
          description: event.notification.message,
        });
      }
    }

    function connect() {
      if (disposed) return;

      sourceRef.current?.close();
      const source = new EventSource("/api/notifications/stream");
      sourceRef.current = source;

      source.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as NotificationRealtimeEvent;
          handleEvent(event);
        } catch {
          // Ignore malformed payloads.
        }
      };

      source.onerror = () => {
        setConnected(false);
        source.close();
        if (disposed) return;
        reconnectTimer = setTimeout(connect, SSE_RECONNECT_MS);
      };
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loaded,
    connected,
    refresh,
    markRead,
    markAllRead,
  };
}
