function normalizeOrigin(value: string) {
  return value.replace(/\/$/, "");
}

function stripProtocol(host: string) {
  return host.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getConfiguredAppUrl() {
  const explicit =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (explicit) {
    return normalizeOrigin(explicit);
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    return normalizeOrigin(
      vercelProduction.startsWith("http") ? vercelProduction : `https://${stripProtocol(vercelProduction)}`,
    );
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return normalizeOrigin(`https://${stripProtocol(vercelUrl)}`);
  }

  return undefined;
}

export function getRequestOrigin(request: Request) {
  try {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost?.split(",")[0]?.trim() || request.headers.get("host")?.trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto = forwardedProto || (host?.includes("localhost") ? "http" : "https");

    if (host) {
      return normalizeOrigin(`${proto}://${host}`);
    }
  } catch {
    // Fall back to request URL origin.
  }

  return normalizeOrigin(new URL(request.url).origin);
}

export function getAppUrl(requestOrOrigin?: Request | string) {
  const requestOrigin =
    requestOrOrigin instanceof Request
      ? getRequestOrigin(requestOrOrigin)
      : requestOrOrigin
        ? normalizeOrigin(requestOrOrigin)
        : undefined;

  if (requestOrigin) {
    return requestOrigin;
  }

  const configured = getConfiguredAppUrl();
  if (configured) {
    return configured;
  }

  return "http://localhost:3000";
}

export function getIntegrationRedirectUri(provider: string, requestOrOrigin?: Request | string) {
  return `${getAppUrl(requestOrOrigin)}/api/integrations/${provider}/callback`;
}
