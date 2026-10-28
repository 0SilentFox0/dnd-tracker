/**
 * Rate limiting через `@upstash/ratelimit` (sliding window).
 * Fail-open: без Upstash запит пропускається, крім викликів з `memoryFallback` — вони рахуються в пам'яті інстанса.
 */
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { getRedisClient } from "@/lib/redis";

export interface RateLimitInput {
  /** Хто робить запит — зазвичай userId з сесії. */
  userId: string;
  /** Який endpoint лімітуємо ("attack", "spell", "next-turn", тощо). */
  scope: string;
  /** Контекст для гранулярності — battleId, campaignId. */
  battleId?: string;
  /** Максимум запитів у вікні. */
  limit: number;
  /** Тривалість вікна (секунди). */
  windowSeconds: number;
  /** Без Redis рахувати вікно в пам'яті інстанса замість fail-open (для платних викликів). */
  memoryFallback?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Скільки запитів вже зроблено. */
  count: number;
  /** Ліміт. */
  limit: number;
  /** Скільки секунд до reset вікна. */
  retryAfterSeconds: number;
}

// Cache Ratelimit instances по комбінації limit+window — щоб не створювати
// новий instance для кожного запиту (вони shared у межах процесу).
const ratelimiterCache = new Map<string, Ratelimit>();

function getRatelimiter(limit: number, windowSeconds: number): Ratelimit | null {
  const redis = getRedisClient();

  if (!redis) return null;

  const key = `${limit}/${windowSeconds}s`;

  const cached = ratelimiterCache.get(key);

  if (cached) return cached;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: "ratelimit",
    analytics: false,
  });

  ratelimiterCache.set(key, limiter);

  return limiter;
}

const MEMORY_MAX_KEYS = 5000;

const memoryHits = new Map<string, number[]>();

function checkMemoryLimit(identifier: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();

  const windowMs = windowSeconds * 1000;

  const hits = (memoryHits.get(identifier) ?? []).filter((t) => now - t < windowMs);

  const allowed = hits.length < limit;

  if (allowed) hits.push(now);

  memoryHits.delete(identifier);
  memoryHits.set(identifier, hits);

  if (memoryHits.size > MEMORY_MAX_KEYS) {
    const oldest = memoryHits.keys().next().value;

    if (oldest !== undefined) memoryHits.delete(oldest);
  }

  return {
    allowed,
    count: hits.length,
    limit,
    retryAfterSeconds: allowed ? windowSeconds : Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)),
  };
}

export async function checkRateLimit(
  input: RateLimitInput,
): Promise<RateLimitResult> {
  const { userId, scope, battleId, limit, windowSeconds, memoryFallback } = input;

  const result: RateLimitResult = {
    allowed: true,
    count: 0,
    limit,
    retryAfterSeconds: windowSeconds,
  };

  const limiter = getRatelimiter(limit, windowSeconds);

  const identifier = battleId
    ? `${userId}:${battleId}:${scope}`
    : `${userId}:${scope}`;

  if (!limiter) {
    return memoryFallback ? checkMemoryLimit(identifier, limit, windowSeconds) : result;
  }

  try {
    const { success, limit: lim, remaining, reset } =
      await limiter.limit(identifier);

    const retryAfterSeconds = Math.max(
      0,
      Math.ceil((reset - Date.now()) / 1000),
    );

    return {
      allowed: success,
      count: lim - remaining,
      limit: lim,
      retryAfterSeconds: success ? windowSeconds : retryAfterSeconds,
    };
  } catch (err) {
    console.warn("[rate-limit] redis error — fail-open", {
      scope,
      userId,
      battleId,
      error: String(err),
    });

    return memoryFallback ? checkMemoryLimit(identifier, limit, windowSeconds) : result;
  }
}

/**
 * Convenience: 429 response з Retry-After header.
 */
export function rateLimitResponse(rl: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: API_ERRORS.TOO_MANY_REQUESTS,
      retryAfterSeconds: rl.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(rl.retryAfterSeconds),
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(Math.max(0, rl.limit - rl.count)),
      },
    },
  );
}

/**
 * Дефолтні пресети для battle endpoints.
 * Підлаштувати залежно від реального юзкейсу.
 */
export const BATTLE_RATE_LIMITS = {
  /** Будь-яка mutation у бою — захист від спаму. */
  default: { limit: 30, windowSeconds: 10 },
  /** Атака — найчастіша операція. */
  attack: { limit: 30, windowSeconds: 10 },
  /** Заклинання — повільніший процес. */
  spell: { limit: 30, windowSeconds: 10 },
  /** Бонус-дія. */
  bonusAction: { limit: 30, windowSeconds: 10 },
  /** Вміння як основна дія. */
  abilityAction: { limit: 30, windowSeconds: 10 },
  /** Рух по карті — кілька кроків поспіль за хід. */
  move: { limit: 60, windowSeconds: 10 },
  /** Місцевість на карті (ДМ) — штрих за штрихом. */
  mapTerrain: { limit: 60, windowSeconds: 10 },
  /** Правка лабіринту (ДМ). */
  maze: { limit: 60, windowSeconds: 10 },
  /** Мітка гравця в лабіринті. */
  mazeMark: { limit: 30, windowSeconds: 10 },
  /** Погода на карті (ДМ) — рідко. */
  mapWeather: { limit: 10, windowSeconds: 10 },
  /** Музика бою (ДМ): перемикання треків. */
  audio: { limit: 20, windowSeconds: 10 },
  /** Показ слайдів (ДМ): гортання і музика. */
  show: { limit: 30, windowSeconds: 10 },
  /** Next-turn — DM advance, рідше викликається. */
  nextTurn: { limit: 20, windowSeconds: 10 },
  /** PATCH HP / remove participant — DM-only, частіше OK. */
  participantPatch: { limit: 60, windowSeconds: 10 },
} as const;

/** AI на ключі DM, який викликають гравці (передісторія, портрет): 10 викликів / 10 хв на користувача й кампанію. */
export const AI_PLAYER_RATE_LIMIT = { limit: 10, windowSeconds: 600 } as const;
