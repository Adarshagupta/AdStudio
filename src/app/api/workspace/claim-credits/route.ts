import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { WELCOME_CREDIT_BONUS, claimWelcomeCredits } from "@/lib/billing/welcome-credits";

export async function POST() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only workspace admins can claim welcome credits." },
      { status: 403 },
    );
  }

  try {
    const result = await claimWelcomeCredits(currentUser.workspace.id, currentUser.user.id);

    return NextResponse.json({
      ok: true,
      alreadyClaimed: result.alreadyClaimed,
      creditsRemaining: result.creditsRemaining,
      bonus: WELCOME_CREDIT_BONUS,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not claim credits." },
      { status: 400 },
    );
  }
}
