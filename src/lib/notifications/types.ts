import type { NotificationType } from "@prisma/client";

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationRealtimeEvent =
  | { type: "hello"; unreadCount: number }
  | { type: "notification"; notification: NotificationDto; unreadCount: number }
  | { type: "unread_count"; unreadCount: number };
