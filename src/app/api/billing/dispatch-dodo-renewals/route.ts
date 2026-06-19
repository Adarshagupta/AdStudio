import { NextResponse } from "next/server";

import { chargeDueDodoSubscriptionRenewals } from "@/lib/billing/dodo-renewals";

export async function POST(request: Request) {
  const secret = process.env.EMAIL_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await chargeDueDodoSubscriptionRenewals();
  return NextResponse.json(result);
}
