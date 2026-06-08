import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount, listNotifications } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(currentUser.user.id),
    getUnreadNotificationCount(currentUser.user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
