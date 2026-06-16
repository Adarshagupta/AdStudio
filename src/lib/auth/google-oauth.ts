import "server-only";

import { getOAuthAppUrl } from "@/lib/integrations/app-url";

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function getGoogleRedirectUri(requestOrOrigin?: Request | string) {
  return `${getOAuthAppUrl(requestOrOrigin)}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(input: {
  intent: "login" | "signup";
  requestOrOrigin?: Request | string;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error("Google sign-in is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(input.requestOrOrigin),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    include_granted_scopes: "true",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(code: string, requestOrOrigin?: Request | string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Google sign-in is not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(requestOrOrigin),
      grant_type: "authorization_code",
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google token exchange failed.");
  }

  return data.access_token;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    error?: string;
  };

  if (!response.ok || !data.sub || !data.email) {
    throw new Error(data.error || "Could not load Google profile.");
  }

  return {
    sub: data.sub,
    email: data.email.trim().toLowerCase(),
    emailVerified: data.email_verified === true,
    name: data.name?.trim() || null,
    picture: data.picture ?? null,
  };
}
