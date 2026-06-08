import "server-only";

import { getRedisClient, getRedisSubscriber } from "@/lib/redis";
import { presenceColorForUser } from "@/lib/studio-pro/presence-color";
import type {
  StudioPresencePayload,
  StudioRealtimeEvent,
} from "@/lib/studio-pro/realtime-types";

export type { StudioPresencePayload, StudioRealtimeEvent, StudioSyncPayload } from "@/lib/studio-pro/realtime-types";
export { presenceColorForUser };

const CHANNEL_PREFIX = "studio-flow:";
const PRESENCE_PREFIX = "studio-presence:";
const PRESENCE_TTL_SECONDS = 45;

type Listener = (event: StudioRealtimeEvent) => void;

const memoryListeners = new Map<string, Set<Listener>>();
const memoryPresence = new Map<string, Map<string, StudioPresencePayload>>();
const redisListeners = new Map<string, Set<Listener>>();

let subscriberReady = false;

function flowChannel(flowId: string) {
  return `${CHANNEL_PREFIX}${flowId}`;
}

function presenceKey(flowId: string) {
  return `${PRESENCE_PREFIX}${flowId}`;
}

function ensureRedisSubscriber() {
  const subscriber = getRedisSubscriber();
  if (!subscriber) return null;

  if (!subscriberReady) {
    subscriber.on("message", (channel, message) => {
      const listeners = redisListeners.get(channel);
      if (!listeners?.size) return;

      try {
        const event = JSON.parse(message) as StudioRealtimeEvent;
        listeners.forEach((listener) => listener(event));
      } catch {
        // Ignore malformed messages.
      }
    });
    subscriberReady = true;
  }

  return subscriber;
}

function publishMemory(flowId: string, event: StudioRealtimeEvent) {
  memoryListeners.get(flowId)?.forEach((listener) => listener(event));
}

function publishRedis(flowId: string, event: StudioRealtimeEvent) {
  const redis = getRedisClient();
  if (!redis) return;

  void redis.publish(flowChannel(flowId), JSON.stringify(event)).catch(() => undefined);
}

export function publishStudioRealtimeEvent(flowId: string, event: StudioRealtimeEvent) {
  publishMemory(flowId, event);
  publishRedis(flowId, event);
}

export async function setStudioPresence(flowId: string, presence: StudioPresencePayload) {
  const bucket = memoryPresence.get(flowId) ?? new Map<string, StudioPresencePayload>();
  bucket.set(presence.clientId, presence);
  memoryPresence.set(flowId, bucket);

  publishStudioRealtimeEvent(flowId, { type: "presence", payload: presence });

  const redis = getRedisClient();
  if (!redis) return;

  const key = presenceKey(flowId);
  void redis
    .hset(key, presence.clientId, JSON.stringify(presence))
    .then(() => redis.expire(key, PRESENCE_TTL_SECONDS))
    .catch(() => undefined);
}

export async function clearStudioPresence(flowId: string, clientId: string) {
  memoryPresence.get(flowId)?.delete(clientId);
  publishStudioRealtimeEvent(flowId, { type: "presence_leave", payload: { clientId } });

  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.hdel(presenceKey(flowId), clientId);
  } catch {
    // Ignore.
  }
}

export async function listStudioPresence(flowId: string) {
  const redis = getRedisClient();
  const merged = new Map<string, StudioPresencePayload>();

  memoryPresence.get(flowId)?.forEach((value, key) => merged.set(key, value));

  if (redis) {
    try {
      const raw = await redis.hgetall(presenceKey(flowId));
      for (const [clientId, value] of Object.entries(raw)) {
        try {
          merged.set(clientId, JSON.parse(value) as StudioPresencePayload);
        } catch {
          merged.delete(clientId);
        }
      }
    } catch {
      // Fall back to memory map.
    }
  }

  const now = Date.now();
  return Array.from(merged.values()).filter(
    (entry) => now - entry.updatedAt < PRESENCE_TTL_SECONDS * 1000,
  );
}

export function subscribeStudioRealtime(flowId: string, listener: Listener) {
  const channel = flowChannel(flowId);

  const memorySet = memoryListeners.get(flowId) ?? new Set<Listener>();
  memorySet.add(listener);
  memoryListeners.set(flowId, memorySet);

  const redisSet = redisListeners.get(channel) ?? new Set<Listener>();
  redisSet.add(listener);
  redisListeners.set(channel, redisSet);

  const sub = ensureRedisSubscriber();
  if (sub) {
    void sub.subscribe(channel).catch(() => undefined);
  }

  return () => {
    memorySet.delete(listener);
    if (!memorySet.size) memoryListeners.delete(flowId);

    redisSet.delete(listener);
    if (!redisSet.size) {
      redisListeners.delete(channel);
      void sub?.unsubscribe(channel).catch(() => undefined);
    }
  };
}
