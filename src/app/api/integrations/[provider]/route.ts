import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { disconnectSocialAccount } from "@/lib/integrations/connections";
import { isSocialProviderId } from "@/lib/integrations/types";

type RouteContext = {
  params: { provider: string };
};

export async function DELETE(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageIntegrations")) {
    return NextResponse.json({ error: "You do not have access to integrations." }, { status: 403 });
  }

  const provider = context.params.provider;

  if (!isSocialProviderId(provider)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  await disconnectSocialAccount(currentUser.workspace.id, provider);
  return NextResponse.json({ ok: true });
}
