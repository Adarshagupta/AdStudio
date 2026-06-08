import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/integrations/app-url";
import { createOAuthState } from "@/lib/integrations/oauth-state";
import { buildProviderAuthorizeUrl, getProviderConfig } from "@/lib/integrations/providers";
import { isSocialProviderId } from "@/lib/integrations/types";

type RouteContext = {
  params: { provider: string };
};

function redirectToIntegrations(request: Request, params: Record<string, string>) {
  const url = new URL("/settings/integrations", getAppUrl(request));

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.redirect(new URL("/login", getAppUrl(request)));
  }

  if (!currentUserCan(currentUser, "manageIntegrations")) {
    return redirectToIntegrations(request, { error: "permission_denied" });
  }

  const provider = context.params.provider;

  if (!isSocialProviderId(provider)) {
    return redirectToIntegrations(request, { error: "unknown_provider" });
  }

  const config = getProviderConfig(provider);

  if (!config.configured) {
    return redirectToIntegrations(request, { error: "not_configured", provider });
  }

  const state = createOAuthState({
    provider,
    workspaceId: currentUser.workspace.id,
    userId: currentUser.user.id,
  });

  const authorizeUrl = buildProviderAuthorizeUrl(provider, state);
  return NextResponse.redirect(authorizeUrl);
}
