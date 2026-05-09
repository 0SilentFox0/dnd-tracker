/**
 * Upstash Redis singleton (REST API).
 *
 * Чому REST а не TCP: Vercel serverless cold starts відкривають нове
 * TCP-підключення на кожен інстанс — швидко вичерпує connection pool
 * Redis провайдера. REST працює через звичайний HTTP fetch, без
 * persistent connection, скейлиться разом з serverless.
 *
 * Env vars (обидві обов'язкові для активації):
 *   UPSTASH_REDIS_REST_URL=https://xxx-xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=gQAA...
 *
 * Якщо хоч однієї немає — повертає `null`. Споживачі мають
 * обробляти `null` як "Redis недоступний" (fail-open).
 *
 * Налаштування у Vercel:
 *   1. Upstash console → Database → REST API → Endpoint URL + Token
 *   2. Vercel project → Settings → Environment Variables → додати обидві
 */

import { Redis } from "@upstash/redis";

let cachedClient: Redis | null = null;

let resolved = false;

/**
 * Повертає Upstash Redis клієнт або `null` якщо env vars не встановлені.
 * Не throw — fail-open для cache/rate-limit hot path.
 */
export function getRedisClient(): Redis | null {
  if (resolved) return cachedClient;

  resolved = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;

  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    cachedClient = new Redis({ url, token });

    return cachedClient;
  } catch (err) {
    console.warn("[redis] init failed — running без Redis", {
      error: String(err),
    });

    return null;
  }
}
