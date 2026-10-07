/**
 * Upstash Redis singleton через REST, не TCP: serverless cold starts не вичерпують connection pool.
 * Читає першу наявну пару env: `UPSTASH_REDIS_REST_*`, `KV_REST_API_*`, `dnd_KV_REST_API_*`.
 * Без пари повертає `null` — споживачі трактують це як "Redis недоступний" (fail-open).
 */

import { Redis } from "@upstash/redis";

let cachedClient: Redis | null = null;

let resolved = false;

interface UpstashCreds {
  url: string;
  token: string;
}

function readUpstashCreds(): UpstashCreds | null {
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
