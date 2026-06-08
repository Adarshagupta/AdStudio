import "server-only";

import type { Notification, NotificationType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { publishNotificationEvent } from "@/lib/notifications/realtime";
import type { NotificationDto } from "@/lib/notifications/types";

export function serializeNotification(notification: Notification): NotificationDto {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    href: notification.href,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function listNotifications(userId: string, limit = 30) {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return items.map(serializeNotification);
}

export async function createNotification(input: {
  userId: string;
  workspaceId: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
    },
  });

  const dto = serializeNotification(notification);
  const unreadCount = await getUnreadNotificationCount(input.userId);

  publishNotificationEvent(input.userId, {
    type: "notification",
    notification: dto,
    unreadCount,
  });

  return dto;
}

export async function createNotifications(
  inputs: Array<{
    userId: string;
    workspaceId: string;
    type: NotificationType;
    title: string;
    message: string;
    href?: string | null;
  }>,
) {
  if (!inputs.length) return [];

  const created = await prisma.$transaction(
    inputs.map((input) =>
      prisma.notification.create({
        data: {
          userId: input.userId,
          workspaceId: input.workspaceId,
          type: input.type,
          title: input.title,
          message: input.message,
          href: input.href ?? null,
        },
      }),
    ),
  );

  const unreadCounts = new Map<string, number>();
  for (const userId of Array.from(new Set(created.map((item) => item.userId)))) {
    unreadCounts.set(userId, await getUnreadNotificationCount(userId));
  }

  for (const notification of created) {
    const dto = serializeNotification(notification);
    publishNotificationEvent(notification.userId, {
      type: "notification",
      notification: dto,
      unreadCount: unreadCounts.get(notification.userId) ?? 1,
    });
  }

  return created.map(serializeNotification);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const updated = await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });

  if (!updated.count) return null;

  const unreadCount = await getUnreadNotificationCount(userId);
  publishNotificationEvent(userId, { type: "unread_count", unreadCount });
  return unreadCount;
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  publishNotificationEvent(userId, { type: "unread_count", unreadCount: 0 });
  return 0;
}

export async function notifyWorkspaceAdmins(
  workspaceId: string,
  input: {
    type: NotificationType;
    title: string;
    message: string;
    href?: string | null;
    excludeUserId?: string;
  },
) {
  const admins = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      isActive: true,
      role: "ADMIN",
      ...(input.excludeUserId ? { userId: { not: input.excludeUserId } } : {}),
    },
    select: { userId: true },
  });

  if (!admins.length) return [];

  return createNotifications(
    admins.map((admin) => ({
      userId: admin.userId,
      workspaceId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
    })),
  );
}
