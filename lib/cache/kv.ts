/**
 * Опціональний кеш через Redis (REDIS_URL).
 * Redis Labs / Redis Cloud — redis://...
 * Інакше — no-op, застосунок працює без Redis.
 */

const KV_TTL_SECONDS = 60;

let cachedRedisClient: {
  get: (k: string) => Promise<string | null>;
  setEx: (k: string, s: number, v: string) => Promise<string>;
  del: (k: string) => Promise<number>;
} | null = null;

async function getRedisClient() {
  if (cachedRedisClient) return cachedRedisClient;
  if (!process.env.REDIS_URL) return null;

  try {
    const { createClient } = await import("redis");
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    cachedRedisClient = client;
    return cachedRedisClient;
  } catch {
    return null;
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    if (data == null) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function kvSet(
  key: string,
  value: unknown,
  ttlSeconds = KV_TTL_SECONDS,
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export async function kvDel(key: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}
