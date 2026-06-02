import { NextResponse } from "next/server";

import { dispatchDueEmailWorkspaces } from "@/lib/email/service";

export async function GET(request: Request) {
  const secret = process.env.EMAIL_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();

  if (secret) {
    const authorization = request.headers.get("authorization");
    const querySecret = new URL(request.url).searchParams.get("secret");

    if (authorization !== `Bearer ${secret}` && querySecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await dispatchDueEmailWorkspaces();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
