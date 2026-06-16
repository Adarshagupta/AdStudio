import { verifyStudioRealtimeToken } from "./jwt";
import { StudioRoom } from "./studio-room";

export { StudioRoom };

export interface Env {
  STUDIO_ROOM: DurableObjectNamespace<StudioRoom>;
  STUDIO_REALTIME_JWT_SECRET: string;
  ALLOWED_ORIGINS?: string;
}

const LITEMOOV_ORIGIN_SUFFIXES = [".litemoov.com", "litemoov.com"] as const;

function allowedOrigins(env: Env) {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isLiteMoovOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return LITEMOOV_ORIGIN_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(suffix),
    );
  } catch {
    return false;
  }
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = allowedOrigins(env);
  const allowOrigin =
    allowed.length === 0 ||
    allowed.includes(origin) ||
    allowed.includes("*") ||
    isLiteMoovOrigin(origin)
      ? origin || "*"
      : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function isOriginAllowed(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;

  if (isLiteMoovOrigin(origin)) return true;

  const allowed = allowedOrigins(env);
  if (allowed.length === 0) return true;
  return allowed.includes(origin) || allowed.includes("*");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true }, { headers: corsHeaders(request, env) });
    }

    const match = url.pathname.match(/^\/flow\/([^/]+)$/);
    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    if (!isOriginAllowed(request, env)) {
      return new Response("Forbidden origin", { status: 403 });
    }

    const flowId = match[1];
    const token = url.searchParams.get("token");
    const clientId = url.searchParams.get("clientId");

    if (!token || !clientId) {
      return new Response("Missing token or clientId", { status: 400 });
    }

    const claims = await verifyStudioRealtimeToken(token, env.STUDIO_REALTIME_JWT_SECRET);
    if (!claims || claims.flowId !== flowId || claims.clientId !== clientId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const stub = env.STUDIO_ROOM.getByName(flowId);
    const headers = new Headers(request.headers);
    headers.set("X-Studio-User-Id", claims.userId);
    headers.set("X-Studio-User-Name", claims.name);
    headers.set("X-Studio-User-Color", claims.color);

    const forwarded = new Request(request.url, {
      method: request.method,
      headers,
    });

    const response = await stub.fetch(forwarded);
    const nextHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(request, env))) {
      nextHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: nextHeaders,
      webSocket: response.webSocket,
    });
  },
};
