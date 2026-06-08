import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string };
};

export async function POST(_request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unreadCount = await markNotificationRead(currentUser.user.id, params.id);

  if (unreadCount === null) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, unreadCount });
}
