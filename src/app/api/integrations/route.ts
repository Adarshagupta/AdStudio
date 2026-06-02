import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { listIntegrationStatuses } from "@/lib/integrations/connections";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageIntegrations")) {
    return NextResponse.json({ error: "You do not have access to integrations." }, { status: 403 });
  }

  const providers = await listIntegrationStatuses(currentUser.workspace.id);
  return NextResponse.json({ providers });
}
