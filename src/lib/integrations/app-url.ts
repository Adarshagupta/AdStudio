export function getAppUrl() {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export function getIntegrationRedirectUri(provider: string) {
  return `${getAppUrl()}/api/integrations/${provider}/callback`;
}
