import { NextResponse } from "next/server";

import { getKvClient, isKvConfigured } from "@/lib/kv";
import { getRedisClient, isRedisConfigured } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  if (isKvConfigured()) {
    const kv = getKvClient();
    try {
      const pong = await kv?.ping();
      checks.kv = {
        ok: pong === "PONG",
        detail: pong === "PONG" ? "Vercel KV / Upstash REST connected." : "KV ping failed.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "KV ping failed.";
      checks.kv = { ok: false, detail: message };
    }
  } else {
    checks.kv = {
      ok: false,
      detail: "Add Upstash Redis from Vercel Marketplace (UPSTASH_REDIS_REST_URL + TOKEN).",
    };
  }

  if (isRedisConfigured()) {
    const redis = getRedisClient();
    try {
      const pong = await redis?.ping();
      checks.pubsub = {
        ok: pong === "PONG",
        detail:
          pong === "PONG"
            ? "Redis TCP connected (queues + SSE fan-out)."
            : "Redis TCP ping failed.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Redis TCP ping failed.";
      checks.pubsub = { ok: false, detail: message };
    }
  } else {
    checks.pubsub = {
      ok: false,
      detail: "REDIS_URL optional — enables BullMQ queue and multi-instance SSE fan-out.",
    };
  }

  const ok = checks.kv.ok || checks.pubsub.ok;

  return NextResponse.json(
    {
      ok,
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
