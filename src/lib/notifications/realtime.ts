import "server-only";

import { getRedisClient, getRedisSubscriber } from "@/lib/redis";
import type { NotificationRealtimeEvent } from "@/lib/notifications/types";

const CHANNEL_PREFIX = "notifications:user:";

type Listener = (event: NotificationRealtimeEvent) => void;

const memoryListeners = new Map<string, Set<Listener>>();
const redisListeners = new Map<string, Set<Listener>>();
let subscriberReady = false;

function userChannel(userId: string) {
  return `${CHANNEL_PREFIX}${userId}`;
}

function ensureRedisSubscriber() {
  const subscriber = getRedisSubscriber();
  if (!subscriber) return null;

  if (!subscriberReady) {
    subscriber.on("message", (channel, message) => {
      const listeners = redisListeners.get(channel);
      if (!listeners?.size) return;

      try {
        const event = JSON.parse(message) as NotificationRealtimeEvent;
        listeners.forEach((listener) => listener(event));
      } catch {
        // Ignore malformed messages.
      }
    });
    subscriberReady = true;
  }

  return subscriber;
}

function publishMemory(userId: string, event: NotificationRealtimeEvent) {
  memoryListeners.get(userId)?.forEach((listener) => listener(event));
}

function publishRedis(userId: string, event: NotificationRealtimeEvent) {
  const redis = getRedisClient();
  if (!redis) return;

  void redis.publish(userChannel(userId), JSON.stringify(event)).catch(() => undefined);
}

export function publishNotificationEvent(userId: string, event: NotificationRealtimeEvent) {
  publishMemory(userId, event);
  publishRedis(userId, event);
}

export function subscribeNotificationRealtime(userId: string, listener: Listener) {
  const channel = userChannel(userId);

  const memorySet = memoryListeners.get(userId) ?? new Set<Listener>();
  memorySet.add(listener);
  memoryListeners.set(userId, memorySet);

  const redisSet = redisListeners.get(channel) ?? new Set<Listener>();
  redisSet.add(listener);
  redisListeners.set(channel, redisSet);

  const sub = ensureRedisSubscriber();
  if (sub) {
    void sub.subscribe(channel).catch(() => undefined);
  }

  return () => {
    memorySet.delete(listener);
    if (!memorySet.size) memoryListeners.delete(userId);

    redisSet.delete(listener);
    if (!redisSet.size) {
      redisListeners.delete(channel);
      void sub?.unsubscribe(channel).catch(() => undefined);
    }
  };
}
