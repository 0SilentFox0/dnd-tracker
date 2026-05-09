/**
 * Upstash Redis singleton (REST API).
 *
 * Чому REST а не TCP: Vercel serverless cold starts відкривають нове
 * TCP-підключення на кожен інстанс — швидко вичерпує connection pool
 * Redis провайдера. REST працює через звичайний HTTP fetch, без
 * persistent connection, скейлиться разом з serverless.
 *
 * Підтримує кілька env-var префіксів (читає першу пару що знайдеться):
 *  1. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (standard)
 *  2. `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Vercel KV default)
 *  3. `dnd_KV_REST_API_URL` + `dnd_KV_REST_API_TOKEN` (Vercel KV з префіксом)
 *
 * Якщо жодної пари немає — повертає `null`. Споживачі мають
 * обробляти `null` як "Redis недоступний" (fail-open).
 *
 * Налаштування у Vercel:
 *   - Vercel KV integration створює env vars автоматично (KV_REST_API_*).
 *   - Або вручну додайте UPSTASH_REDIS_REST_URL/TOKEN з Upstash console.
 */

import { Redis } from "@upstash/redis";

let cachedClient: Redis | null = null;

let resolved = false;

interface UpstashCreds {
  url: string;
  token: string;
}

function readUpstashCreds(): UpstashCreds | null {
  // Перевіряємо у пріоритеті: standard → Vercel KV default → user-prefixed.
  const candidates: Array<[string, string]> = [
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["dnd_KV_REST_API_URL", "dnd_KV_REST_API_TOKEN"],
  ];

  for (const [urlVar, tokenVar] of candidates) {
    const url = process.env[urlVar]?.trim();

    const token = process.env[tokenVar]?.trim();

    if (url && token) {
      return { url, token };
    }
  }

  return null;
}

/**
 * Повертає Upstash Redis клієнт або `null` якщо env vars не встановлені.
 * Не throw — fail-open для cache/rate-limit hot path.
 */
export function getRedisClient(): Redis | null {
  if (resolved) return cachedClient;

  resolved = true;

  const creds = readUpstashCreds();

  if (!creds) return null;

  try {
    cachedClient = new Redis(creds);

    return cachedClient;
  } catch (err) {
    console.warn("[redis] init failed — running без Redis", {
      error: String(err),
    });

    return null;
  }
}
