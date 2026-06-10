import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceUsage } from "@/lib/billing/credits";
import { planGenerationLimits } from "@/lib/billing/plans";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usage = await getWorkspaceUsage(currentUser.workspace.id);
  const plan = currentUser.workspace.plan as keyof typeof planGenerationLimits;
  const limits = planGenerationLimits[plan] ?? planGenerationLimits.FREE;

  return NextResponse.json({
    usage,
    limits: {
      videoMinutes: limits.videoMinutes === Infinity ? null : limits.videoMinutes,
      imageCount: limits.imageCount === Infinity ? null : limits.imageCount,
    },
  });
}
