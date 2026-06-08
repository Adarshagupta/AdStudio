import "server-only";

import Redis, { type RedisOptions } from "ioredis";

const KEY_PREFIX = "ugc";

export function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL?.trim());
}

function redisUrl() {
  return process.env.REDIS_URL?.trim() ?? "";
}

function clientOptions(purpose: "command" | "subscriber" | "bullmq"): RedisOptions {
  return {
    lazyConnect: true,
    connectTimeout: 5_000,
    maxRetriesPerRequest: purpose === "bullmq" ? null : 2,
    enableReadyCheck: false,
  };
}

let commandClient: Redis | null = null;
let subscriberClient: Redis | null = null;

export function getRedisClient() {
  if (!isRedisConfigured()) return null;
  commandClient ??= new Redis(redisUrl(), clientOptions("command"));
  return commandClient;
}

export function getRedisSubscriber() {
  if (!isRedisConfigured()) return null;
  subscriberClient ??= new Redis(redisUrl(), clientOptions("subscriber"));
  return subscriberClient;
}

export function getBullmqConnection() {
  if (!isRedisConfigured()) return null;
  return {
    url: redisUrl(),
    maxRetriesPerRequest: null as null,
  };
}

export function redisKey(...parts: string[]) {
  return `${KEY_PREFIX}:${parts.join(":")}`;
}
