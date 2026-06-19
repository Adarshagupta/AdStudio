import { NextResponse } from "next/server";

import { cookies } from "next/headers";

import { createSession } from "@/lib/auth";
import { consumeGoogleOAuthState } from "@/lib/auth/google-oauth-state";
import { exchangeGoogleAuthCode, fetchGoogleProfile } from "@/lib/auth/google-oauth";
import {
  resolveGoogleAuthUser,
  resolveGoogleAuthWorkspaceId,
} from "@/lib/auth/google-sign-in";
import { getAppUrl } from "@/lib/integrations/app-url";
import { isWorkspaceOnboardingCompleteCached } from "@/lib/onboarding-gate";
import { readReferralCodeFromCookie, REFERRAL_COOKIE } from "@/lib/referral/codes";

function authReturnPath(intent: "login" | "signup") {
  return intent === "signup" ? "/signup" : "/login";
}

function redirectWithError(request: Request, intent: "login" | "signup", code: string) {
  const path = authReturnPath(intent);
  const url = new URL(path, getAppUrl(request));
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

function postAuthRedirect(request: Request, onboardingComplete: boolean) {
  if (!onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", getAppUrl(request)));
  }

  return NextResponse.redirect(new URL("/dashboard", getAppUrl(request)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = consumeGoogleOAuthState();
  const intent = state?.intent ?? "login";

  if (url.searchParams.get("error")) {
    return redirectWithError(request, intent, "google_denied");
  }

  if (!state) {
    return redirectWithError(request, intent, "google_state");
  }

  const code = url.searchParams.get("code");

  if (!code) {
    return redirectWithError(request, intent, "google_missing_code");
  }

  try {
    const accessToken = await exchangeGoogleAuthCode(code, request);
    const profile = await fetchGoogleProfile(accessToken);
    const cookieReferral = readReferralCodeFromCookie(cookies().get(REFERRAL_COOKIE)?.value);
    const user = await resolveGoogleAuthUser(
      profile,
      state.intent,
      state.referralCode ?? cookieReferral,
    );
    const workspaceId = await resolveGoogleAuthWorkspaceId(user.id);

    await createSession(user.id, workspaceId);

    const onboardingComplete = await isWorkspaceOnboardingCompleteCached(workspaceId);
    return postAuthRedirect(request, onboardingComplete);
  } catch (error) {
    console.error("[google-auth] callback failed:", error);

    const message = error instanceof Error ? error.message : "Google sign-in failed.";
    const url = new URL(authReturnPath(state.intent), getAppUrl(request));
    url.searchParams.set("error", "google_failed");
    url.searchParams.set("message", message.slice(0, 240));
    return NextResponse.redirect(url);
  }
}
