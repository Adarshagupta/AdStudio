import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function createEmailToken() {
  return randomBytes(32).toString("base64url");
}

export function hashEmailToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getEmailTokenExpiresAt(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function constantTimeTokenEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
