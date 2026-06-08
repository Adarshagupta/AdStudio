"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationDto } from "@/lib/notifications/types";

type NotificationContextValue = {
  notifications: NotificationDto[];
  unreadCount: number;
  loaded: boolean;
  connected: boolean;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const value = useNotifications();
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within NotificationProvider.");
  }
  return context;
}
