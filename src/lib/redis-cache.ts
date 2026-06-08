import "server-only";

import { getKvClient, kvKey } from "@/lib/kv";

export async function cacheGet<T>(namespace: string, id: string): Promise<T | null> {
  const kv = getKvClient();
  if (!kv) return null;

  try {
    return (await kv.get<T>(kvKey("cache", namespace, id))) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  namespace: string,
  id: string,
  value: unknown,
  ttlSeconds: number,
) {
  const kv = getKvClient();
  if (!kv) return;

  try {
    await kv.set(kvKey("cache", namespace, id), value, { ex: ttlSeconds });
  } catch {
    // Cache is best-effort.
  }
}

export async function cacheDel(namespace: string, id: string) {
  const kv = getKvClient();
  if (!kv) return;

  try {
    await kv.del(kvKey("cache", namespace, id));
  } catch {
    // Cache is best-effort.
  }
}
