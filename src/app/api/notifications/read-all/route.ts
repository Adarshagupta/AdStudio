import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function POST() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unreadCount = await markAllNotificationsRead(currentUser.user.id);
  return NextResponse.json({ ok: true, unreadCount });
}
