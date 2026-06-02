import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import type { SocialProviderId } from "@/lib/integrations/types";

const OAUTH_STATE_COOKIE = "ugc_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  nonce: string;
  provider: SocialProviderId;
  workspaceId: string;
  userId: string;
  issuedAt: number;
};

function getStateSecret() {
  return (
    process.env.SOCIAL_OAUTH_STATE_SECRET?.trim() ||
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "dev-only-oauth-state-secret"
  );
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getStateSecret()).update(encodedPayload).digest("base64url");
}

function encodeState(payload: OAuthStatePayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function decodeState(value: string): OAuthStatePayload | null {
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
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return null;
  }
}

export function createOAuthState(input: {
  provider: SocialProviderId;
  workspaceId: string;
  userId: string;
}) {
  const payload: OAuthStatePayload = {
    nonce: randomBytes(16).toString("base64url"),
    provider: input.provider,
    workspaceId: input.workspaceId,
    userId: input.userId,
    issuedAt: Date.now(),
  };

  const signed = encodeState(payload);

  cookies().set(OAUTH_STATE_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_TTL_MS / 1000,
  });

  return signed;
}

export function consumeOAuthState(expectedProvider: SocialProviderId) {
  const raw = cookies().get(OAUTH_STATE_COOKIE)?.value;
  cookies().delete(OAUTH_STATE_COOKIE);

  if (!raw) {
    return null;
  }

  const payload = decodeState(raw);

  if (!payload || payload.provider !== expectedProvider) {
    return null;
  }

  if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
    return null;
  }

  return payload;
}
