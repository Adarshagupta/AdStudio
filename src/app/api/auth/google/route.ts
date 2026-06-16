import { NextResponse } from "next/server";

import { createGoogleOAuthState, type GoogleOAuthIntent } from "@/lib/auth/google-oauth-state";
import { buildGoogleAuthUrl, isGoogleAuthConfigured } from "@/lib/auth/google-oauth";

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.json({ error: "Google sign-in is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const intentParam = url.searchParams.get("intent");
  const intent: GoogleOAuthIntent = intentParam === "signup" ? "signup" : "login";
  const refParam = url.searchParams.get("ref");

  createGoogleOAuthState(intent, refParam);

  return NextResponse.redirect(buildGoogleAuthUrl({ intent, requestOrOrigin: request }));
}
