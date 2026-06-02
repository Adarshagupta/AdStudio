import "server-only";

import { createHash, randomBytes } from "crypto";

import type { WorkspaceInviteStatus } from "@prisma/client";

export const INVITE_EXPIRES_IN_DAYS = 14;

export function createInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInviteExpiresAt() {
  return new Date(Date.now() + INVITE_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
}

export function isInviteUsable(invite: {
  status: WorkspaceInviteStatus;
  expiresAt: Date;
}) {
  return invite.status === "PENDING" && invite.expiresAt > new Date();
}

export function buildInviteUrl(origin: string, token: string) {
  return new URL(`/invite/${token}`, origin).toString();
}
