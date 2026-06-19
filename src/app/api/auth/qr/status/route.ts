import { NextResponse } from "next/server";

import { getQrChallenge } from "@/lib/auth/qr-login";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId")?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
  }

  const challenge = await getQrChallenge(sessionId);
  if (!challenge) {
    return NextResponse.json({ status: "expired" });
  }

  return NextResponse.json({
    status: challenge.status,
    intent: challenge.intent,
    expiresAt: challenge.expiresAt,
  });
}
