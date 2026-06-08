import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { listMyTemplateListings } from "@/lib/studio-pro/template-marketplace";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have permission to manage templates." }, { status: 403 });
  }

  const listings = await listMyTemplateListings(currentUser.workspace.id);
  return NextResponse.json({ listings });
}
