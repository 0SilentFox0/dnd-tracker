/**
 * Опціональний кеш через Upstash Redis (REST API).
 *
 * Використовує спільний клієнт із `lib/redis.ts` — той самий, що й
 * rate-limit. Підтримує кілька env-prefix варіантів (UPSTASH_REDIS_REST_*,
 * KV_REST_API_*, dnd_KV_REST_API_*) — див. `lib/redis.ts`.
 *
 * Якщо Redis недоступний — kv* функції стають no-op (повертають null /
 * нічого не зберігають). Застосунок працює без кешу.
 */

import { getRedisClient } from "@/lib/redis";

const KV_TTL_SECONDS = 60;

export async function kvGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();

  if (!redis) return null;

  try {
    // @upstash/redis автоматично JSON-парсить значення.
    const data = await redis.get<T>(key);

    return data ?? null;
  } catch {
    return null;
  }
}

export async function kvSet(
  key: string,
  value: unknown,
  ttlSeconds = KV_TTL_SECONDS,
): Promise<void> {
  const redis = getRedisClient();

  if (!redis) return;

  try {
    // @upstash/redis автоматично JSON-серіалізує об'єкти.
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // ignore
  }
}

export async function kvDel(key: string): Promise<void> {
  const redis = getRedisClient();

  if (!redis) return;

  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}
