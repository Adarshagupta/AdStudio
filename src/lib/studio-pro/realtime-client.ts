export function studioRealtimeBaseUrl() {
  return process.env.NEXT_PUBLIC_STUDIO_REALTIME_URL?.replace(/\/$/, "") ?? "";
}

export function studioRealtimeEnabled() {
  return Boolean(studioRealtimeBaseUrl());
}

export function studioRealtimeWebSocketUrl(baseUrl: string, flowId: string, token: string, clientId: string) {
  const normalized = baseUrl.startsWith("http")
    ? baseUrl.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://")
    : baseUrl;

  const url = new URL(`${normalized}/flow/${flowId}`);
  url.searchParams.set("token", token);
  url.searchParams.set("clientId", clientId);
  return url.toString();
}
