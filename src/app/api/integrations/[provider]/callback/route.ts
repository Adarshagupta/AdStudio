import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { upsertSocialConnection } from "@/lib/integrations/connections";
import { getAppUrl } from "@/lib/integrations/app-url";
import { consumeOAuthState } from "@/lib/integrations/oauth-state";
import { exchangeProviderCode, getProviderConfig } from "@/lib/integrations/providers";
import { isSocialProviderId } from "@/lib/integrations/types";

type RouteContext = {
  params: { provider: string };
};

function redirectToIntegrations(params: Record<string, string>) {
  const url = new URL("/settings/integrations", getAppUrl());

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: Request, context: RouteContext) {
  const provider = context.params.provider;

  if (!isSocialProviderId(provider)) {
    return redirectToIntegrations({ error: "unknown_provider" });
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const statePayload = consumeOAuthState(provider);

  if (error) {
    return redirectToIntegrations({ error: "oauth_denied", provider });
  }

  if (!code || !statePayload) {
    return redirectToIntegrations({ error: "invalid_callback", provider });
  }

  const currentUser = await getCurrentUser();

  if (
    !currentUser ||
    currentUser.workspace.id !== statePayload.workspaceId ||
    currentUser.user.id !== statePayload.userId
  ) {
    return redirectToIntegrations({ error: "session_mismatch", provider });
  }

  if (!currentUserCan(currentUser, "manageIntegrations")) {
    return redirectToIntegrations({ error: "permission_denied", provider });
  }

  const config = getProviderConfig(provider);

  if (!config.configured) {
    return redirectToIntegrations({ error: "not_configured", provider });
  }

  try {
    const { tokens, profile } = await exchangeProviderCode(provider, code);

    await upsertSocialConnection({
      workspaceId: currentUser.workspace.id,
      provider,
      externalId: profile.externalId,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      profileMeta: profile.profileMeta,
    });

    return redirectToIntegrations({ connected: provider });
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "Connection failed.";
    return redirectToIntegrations({ error: "connect_failed", provider, message });
  }
}
