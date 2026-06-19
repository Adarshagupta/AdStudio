import { NextResponse } from "next/server";

import { getCurrentUser, revalidateCurrentSessionCache } from "@/lib/auth";
import { syncWorkspaceBillingFromStripe } from "@/lib/billing/workspace-subscription";

export async function POST() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only workspace admins can sync billing." },
      { status: 403 },
    );
  }

  try {
    const workspace = await syncWorkspaceBillingFromStripe(currentUser.workspace.id);
    revalidateCurrentSessionCache();
    return NextResponse.json({ ok: true, workspace });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync billing.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
