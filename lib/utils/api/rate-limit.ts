/**
 * Rate limiting на API endpoints через `@upstash/ratelimit` (CODE_AUDIT 4.2).
 *
 * Алгоритм: sliding window (точніший за fixed window — не дозволяє
 * спайки на межі вікна).
 *
 * Fail-open: якщо Upstash недоступний (env vars не встановлені) —
 * пропускає запит. Це навмисно: тимчасова недоступність кешу не
 * блокує користувачів.
 *
 * Використання у route handler:
 *   const rl = await checkRateLimit({
 *     userId, scope: "attack", battleId,
 *     ...BATTLE_RATE_LIMITS.attack,
 *   });
 *   if (!rl.allowed) return rateLimitResponse(rl);
 */

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";

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

export async function checkRateLimit(
  input: RateLimitInput,
): Promise<RateLimitResult> {
  const { userId, scope, battleId, limit, windowSeconds } = input;

  const result: RateLimitResult = {
    allowed: true,
    count: 0,
    limit,
    retryAfterSeconds: windowSeconds,
  };

  const limiter = getRatelimiter(limit, windowSeconds);

  if (!limiter) {
    // Fail-open: Redis недоступний — пропускаємо.
    return result;
  }

  const identifier = battleId
    ? `${userId}:${battleId}:${scope}`
    : `${userId}:${scope}`;

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

    return result;
  }
}

/**
 * Convenience: 429 response з Retry-After header.
 */
export function rateLimitResponse(rl: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
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
  /** Next-turn — DM advance, рідше викликається. */
  nextTurn: { limit: 20, windowSeconds: 10 },
  /** PATCH HP / remove participant — DM-only, частіше OK. */
  participantPatch: { limit: 60, windowSeconds: 10 },
} as const;
