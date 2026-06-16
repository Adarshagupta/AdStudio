import { NextResponse } from "next/server";

import { isGoogleAuthConfigured } from "@/lib/auth/google-oauth";

export async function GET() {
  return NextResponse.json({ enabled: isGoogleAuthConfigured() });
}
