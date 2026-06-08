import "server-only";

import { createHmac, randomBytes } from "crypto";

export type StudioRealtimeClaims = {
  flowId: string;
  userId: string;
  name: string;
  color: string;
  workspaceId: string;
  clientId: string;
  iat: number;
  exp: number;
};

const TOKEN_TTL_SECONDS = 300;

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

export function studioRealtimeJwtSecret() {
  const secret = process.env.STUDIO_REALTIME_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("STUDIO_REALTIME_JWT_SECRET is required for Studio realtime.");
  }
  return secret;
}

export function createStudioRealtimeJwtSecret() {
  return randomBytes(32).toString("base64url");
}

export function signStudioRealtimeToken(
  claims: Omit<StudioRealtimeClaims, "iat" | "exp">,
) {
  const secret = studioRealtimeJwtSecret();
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64Url(
    JSON.stringify({
      ...claims,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    }),
  );
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}
