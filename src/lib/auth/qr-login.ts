import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { getRedisClient, redisKey } from "@/lib/redis";

export type QrLoginIntent = "web_login" | "mobile_login";

export type QrChallengeStatus = "pending" | "approved" | "consumed" | "expired";

export type QrChallenge = {
  sessionId: string;
  secret: string;
  intent: QrLoginIntent;
  status: QrChallengeStatus;
  userId?: string;
  workspaceId?: string;
  createdAt: number;
  expiresAt: number;
};

const TTL_SECONDS = 5 * 60;
const memoryStore = new Map<string, QrChallenge>();

function signingKey() {
  return (
    process.env.QR_LOGIN_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "dev-qr-login-secret"
  );
}

export function signQrChallenge(sessionId: string, secret: string) {
  return createHmac("sha256", signingKey())
    .update(`${sessionId}:${secret}`)
    .digest("base64url");
}

export function verifyQrSignature(sessionId: string, secret: string, signature: string) {
  const expected = signQrChallenge(sessionId, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function serialize(challenge: QrChallenge) {
  return JSON.stringify(challenge);
}

function deserialize(raw: string): QrChallenge | null {
  try {
    return JSON.parse(raw) as QrChallenge;
  } catch {
    return null;
  }
}

async function saveChallenge(challenge: QrChallenge) {
  memoryStore.set(challenge.sessionId, challenge);
  const redis = getRedisClient();
  if (!redis) return;
  await redis.set(
    redisKey("qr-login", challenge.sessionId),
    serialize(challenge),
    "EX",
    TTL_SECONDS,
  );
}

async function loadChallenge(sessionId: string): Promise<QrChallenge | null> {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get(redisKey("qr-login", sessionId));
    if (raw) return deserialize(raw);
  }
  return memoryStore.get(sessionId) ?? null;
}

function isExpired(challenge: QrChallenge) {
  return Date.now() > challenge.expiresAt;
}

export async function createQrChallenge(
  intent: QrLoginIntent,
  userId?: string,
  workspaceId?: string,
): Promise<QrChallenge> {
  const sessionId = randomBytes(16).toString("base64url");
  const secret = randomBytes(24).toString("base64url");
  const now = Date.now();

  const challenge: QrChallenge = {
    sessionId,
    secret,
    intent,
    status: "pending",
    userId,
    workspaceId,
    createdAt: now,
    expiresAt: now + TTL_SECONDS * 1000,
  };

  await saveChallenge(challenge);
  return challenge;
}

export async function getQrChallenge(sessionId: string) {
  const challenge = await loadChallenge(sessionId);
  if (!challenge) return null;
  if (isExpired(challenge) && challenge.status === "pending") {
    challenge.status = "expired";
    await saveChallenge(challenge);
  }
  return challenge;
}

export async function approveWebLoginChallenge(
  sessionId: string,
  secret: string,
  signature: string,
  approverUserId: string,
  approverWorkspaceId: string,
) {
  const challenge = await getQrChallenge(sessionId);
  if (!challenge || challenge.intent !== "web_login") {
    throw new Error("Invalid or expired QR code.");
  }
  if (challenge.status !== "pending") {
    throw new Error("This QR code was already used.");
  }
  if (!verifyQrSignature(sessionId, secret, signature)) {
    throw new Error("Invalid QR code signature.");
  }
  if (challenge.secret !== secret) {
    throw new Error("Invalid QR code.");
  }

  challenge.status = "approved";
  challenge.userId = approverUserId;
  challenge.workspaceId = approverWorkspaceId;
  await saveChallenge(challenge);
  return challenge;
}

export async function consumeMobileLoginChallenge(sessionId: string, secret: string, signature: string) {
  const challenge = await getQrChallenge(sessionId);
  if (!challenge || challenge.intent !== "mobile_login") {
    throw new Error("Invalid or expired QR code.");
  }
  if (challenge.status !== "pending") {
    throw new Error("This QR code was already used.");
  }
  if (!verifyQrSignature(sessionId, secret, signature)) {
    throw new Error("Invalid QR code signature.");
  }
  if (challenge.secret !== secret) {
    throw new Error("Invalid QR code.");
  }
  if (!challenge.userId || !challenge.workspaceId) {
    throw new Error("QR code is missing account data.");
  }

  challenge.status = "consumed";
  await saveChallenge(challenge);
  return challenge;
}

export async function consumeWebLoginChallenge(sessionId: string) {
  const challenge = await getQrChallenge(sessionId);
  if (!challenge || challenge.intent !== "web_login") {
    throw new Error("Invalid or expired QR session.");
  }
  if (challenge.status !== "approved") {
    return challenge;
  }
  if (!challenge.userId || !challenge.workspaceId) {
    throw new Error("QR login is missing account data.");
  }

  challenge.status = "consumed";
  await saveChallenge(challenge);
  return challenge;
}

export function buildQrPayload(
  origin: string,
  challenge: QrChallenge,
) {
  const signature = signQrChallenge(challenge.sessionId, challenge.secret);
  return {
    v: 1,
    intent: challenge.intent,
    sid: challenge.sessionId,
    sec: challenge.secret,
    sig: signature,
    host: origin.replace(/\/$/, ""),
  };
}

export function encodeQrPayload(payload: ReturnType<typeof buildQrPayload>) {
  return JSON.stringify(payload);
}
