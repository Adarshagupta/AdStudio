import { NextResponse } from "next/server";

import { planGenerationLimits, subscriptionPlans } from "@/lib/billing/plans";

function verifyAdminSession(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  return cookie.includes("admin_session=");
}

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const plans = subscriptionPlans.map((plan) => ({
      ...plan,
      limits: planGenerationLimits[plan.id as keyof typeof planGenerationLimits],
    }));

    return NextResponse.json({ plans });
  } catch {
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
