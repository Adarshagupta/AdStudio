import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { readReferralCodeFromCookie, REFERRAL_COOKIE } from "@/lib/referral/codes";

const GOOGLE_OAUTH_STATE_COOKIE = "ugc_google_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;

export type GoogleOAuthIntent = "login" | "signup";

type GoogleOAuthStatePayload = {
  nonce: string;
  intent: GoogleOAuthIntent;
  issuedAt: number;
  referralCode?: string;
};

function getStateSecret() {
  return (
    process.env.GOOGLE_OAUTH_STATE_SECRET?.trim() ||
    process.env.SOCIAL_OAUTH_STATE_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "dev-only-google-oauth-state-secret"
  );
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getStateSecret()).update(encodedPayload).digest("base64url");
}

function encodeState(payload: GoogleOAuthStatePayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function decodeState(value: string): GoogleOAuthStatePayload | null {
  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = signPayload(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as GoogleOAuthStatePayload;
  } catch {
    return null;
  }
}

export function createGoogleOAuthState(intent: GoogleOAuthIntent, referralFromQuery?: string | null) {
  const fromQuery = referralFromQuery ? readReferralCodeFromCookie(referralFromQuery) : null;
  const fromCookie = readReferralCodeFromCookie(cookies().get(REFERRAL_COOKIE)?.value);
  const referralCode = fromQuery ?? fromCookie ?? undefined;

  const payload: GoogleOAuthStatePayload = {
    nonce: randomBytes(16).toString("base64url"),
    intent,
    issuedAt: Date.now(),
    ...(referralCode ? { referralCode } : {}),
  };

  cookies().set(GOOGLE_OAUTH_STATE_COOKIE, encodeState(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_TTL_MS / 1000,
  });
}

export function consumeGoogleOAuthState() {
  const raw = cookies().get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  cookies().delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!raw) {
    return null;
  }

  const payload = decodeState(raw);

  if (!payload || Date.now() - payload.issuedAt > STATE_TTL_MS) {
    return null;
  }

  return payload;
}
