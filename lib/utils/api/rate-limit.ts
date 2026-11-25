import type { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { incr } from '@/lib/ops/metrics';
import { getRedisClient } from '@/lib/redis';
import { apiErrorJson } from '@/lib/utils/api/translate-error';

export interface RateLimitInput {
    userId: string;
    scope: string;
    battleId?: string;
    limit: number;
    windowSeconds: number;
    memoryFallback?: boolean;
    failClosed?: boolean;
}

export interface RateLimitResult {
    allowed: boolean;
    count: number;
    limit: number;
    retryAfterSeconds: number;
    unavailable?: boolean;
}

const ratelimiterCache = new Map<string, Ratelimit>();

function getRatelimiter(
    limit: number,
    windowSeconds: number
): Ratelimit | null {
    const redis = getRedisClient();

    if (!redis) return null;

    const key = `${limit}/${windowSeconds}s`;

    const cached = ratelimiterCache.get(key);

    if (cached) return cached;

    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: 'ratelimit',
        analytics: false,
    });

    ratelimiterCache.set(key, limiter);

    return limiter;
}

const MEMORY_MAX_KEYS = 5000;

const memoryHits = new Map<string, number[]>();

function checkMemoryLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
): RateLimitResult {
    const now = Date.now();

    const windowMs = windowSeconds * 1000;

    const hits = (memoryHits.get(identifier) ?? []).filter(
        (t) => now - t < windowMs
    );

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
        retryAfterSeconds: allowed
            ? windowSeconds
            : Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)),
    };
}

function failClosesHere(failClosed: boolean): boolean {
    if (!failClosed || process.env.NODE_ENV !== 'production') return false;

    if (process.env.RATE_LIMIT_ALLOW_MEMORY === '1') return false;

    const env = process.env.VERCEL_ENV;

    return env !== 'preview' && env !== 'development';
}

let warnedNoRedis = false;

function warnNoRedisInProduction() {
    if (warnedNoRedis || process.env.NODE_ENV !== 'production') return;

    warnedNoRedis = true;
    console.error(
        '[rate-limit] Upstash is not configured in production: limits are per-instance memory or skipped'
    );
}

/** Scopes that spend money or heavy compute: without Redis in production they answer 503 instead of failing open. */
const FAIL_CLOSED_SCOPES: ReadonlySet<string> = new Set([
    'content-import-ai-map',
    'scenario-summary',
    'campaign-create',
    'content-import',
    'template-publish',
    'content-copy',
    'map-background-upload',
]);

const FAIL_CLOSED_PREFIXES = ['assistant-', 'ai-', 'mcp', 'draft-'] as const;

export function isFailClosedScope(scope: string): boolean {
    return (
        FAIL_CLOSED_SCOPES.has(scope) ||
        FAIL_CLOSED_PREFIXES.some((prefix) => scope.startsWith(prefix))
    );
}

export async function checkRateLimit(
    input: RateLimitInput
): Promise<RateLimitResult> {
    const result = await evaluateRateLimit(input);

    if (!result.allowed && !result.unavailable)
        incr('ratelimit.denied', 1, {
            scope: Object.hasOwn(BATTLE_RATE_LIMITS, input.scope)
                ? input.scope
                : 'other',
        });

    return result;
}

async function evaluateRateLimit(
    input: RateLimitInput
): Promise<RateLimitResult> {
    const {
        userId,
        scope,
        battleId,
        limit,
        windowSeconds,
        memoryFallback = true,
        failClosed = isFailClosedScope(scope),
    } = input;

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

    const degraded = (): RateLimitResult => {
        const closed = failClosesHere(failClosed);

        incr('ratelimit.degraded', 1, { mode: closed ? 'closed' : 'open' });

        if (closed)
            return {
                allowed: false,
                count: limit,
                limit,
                retryAfterSeconds: 30,
                unavailable: true,
            };

        return memoryFallback
            ? checkMemoryLimit(identifier, limit, windowSeconds)
            : result;
    };

    if (!limiter) {
        warnNoRedisInProduction();

        return degraded();
    }

    try {
        const {
            success,
            limit: lim,
            remaining,
            reset,
        } = await limiter.limit(identifier);

        const retryAfterSeconds = Math.max(
            0,
            Math.ceil((reset - Date.now()) / 1000)
        );

        return {
            allowed: success,
            count: lim - remaining,
            limit: lim,
            retryAfterSeconds: success ? windowSeconds : retryAfterSeconds,
        };
    } catch (err) {
        console.warn('[rate-limit] redis error — fail-open', {
            scope,
            userId,
            battleId,
            error: String(err),
        });

        return degraded();
    }
}

export function rateLimitResponse(rl: RateLimitResult): NextResponse {
    if (rl.unavailable)
        return apiErrorJson(
            { error: API_ERRORS.RATE_LIMIT_UNAVAILABLE },
            { status: 503, headers: { 'Retry-After': '30' } }
        );

    return apiErrorJson(
        {
            error: API_ERRORS.TOO_MANY_REQUESTS,
            retryAfterSeconds: rl.retryAfterSeconds,
        },
        {
            status: 429,
            headers: {
                'Retry-After': String(rl.retryAfterSeconds),
                'X-RateLimit-Limit': String(rl.limit),
                'X-RateLimit-Remaining': String(
                    Math.max(0, rl.limit - rl.count)
                ),
            },
        }
    );
}

export const BATTLE_RATE_LIMITS = {
    default: { limit: 30, windowSeconds: 10 },
    attack: { limit: 30, windowSeconds: 10 },
    spell: { limit: 30, windowSeconds: 10 },
    bonusAction: { limit: 30, windowSeconds: 10 },
    abilityAction: { limit: 30, windowSeconds: 10 },
    move: { limit: 60, windowSeconds: 10 },
    mapTerrain: { limit: 60, windowSeconds: 10 },
    mapWalls: { limit: 60, windowSeconds: 10 },
    mapEdgeRemove: { limit: 60, windowSeconds: 10 },
    mapDoor: { limit: 30, windowSeconds: 10 },
    mapUpdate: { limit: 5, windowSeconds: 10 },
    maze: { limit: 60, windowSeconds: 10 },
    mazeMark: { limit: 30, windowSeconds: 10 },
    mapMotion: { limit: 20, windowSeconds: 10 },
    mapBackground: { limit: 5, windowSeconds: 10 },
    mapWeather: { limit: 10, windowSeconds: 10 },
    audio: { limit: 20, windowSeconds: 10 },
    show: { limit: 30, windowSeconds: 10 },
    puzzle: { limit: 30, windowSeconds: 10 },
    nextTurn: { limit: 20, windowSeconds: 10 },
    participantPatch: { limit: 60, windowSeconds: 10 },
} as const;

export const AI_PLAYER_RATE_LIMIT = { limit: 10, windowSeconds: 600 } as const;

export const DEMO_READ_RATE_LIMIT = { limit: 120, windowSeconds: 60 } as const;

export const JOIN_RATE_LIMIT = { limit: 10, windowSeconds: 600 } as const;

export const IP_RATE_LIMITS = {
    mcp: { limit: 300, windowSeconds: 60 },
    public: { limit: 60, windowSeconds: 60 },
    'csp-report': { limit: 120, windowSeconds: 60 },
} as const;

const DAY_SECONDS = 86_400;

/** Per-user daily caps on abuse-prone heavy actions. */
export const DAILY_LIMITS = {
    campaignCreate: { scope: 'campaign-create', limit: 20 },
    contentImport: { scope: 'content-import', limit: 50 },
    templatePublish: { scope: 'template-publish', limit: 30 },
    contentCopy: { scope: 'content-copy', limit: 100 },
} as const;

export async function checkDailyLimit(
    userId: string,
    key: keyof typeof DAILY_LIMITS
): Promise<NextResponse | null> {
    const { scope, limit } = DAILY_LIMITS[key];

    const rate = await checkRateLimit({
        userId,
        scope,
        limit,
        windowSeconds: DAY_SECONDS,
    });

    return rate.allowed ? null : rateLimitResponse(rate);
}
