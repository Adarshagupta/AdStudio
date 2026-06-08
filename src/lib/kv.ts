import "server-only";

import { Redis } from "@upstash/redis";

const KEY_PREFIX = "ugc";

let kvClient: Redis | null = null;

export function isKvConfigured() {
  const restUrl =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const restToken =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  return Boolean(restUrl && restToken);
}

function createKvClient() {
  if (process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()) {
    return Redis.fromEnv();
  }

  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;

  return new Redis({ url, token });
}

export function getKvClient() {
  if (!isKvConfigured()) return null;
  kvClient ??= createKvClient();
  return kvClient;
}

export function kvKey(...parts: string[]) {
  return `${KEY_PREFIX}:${parts.join(":")}`;
}
