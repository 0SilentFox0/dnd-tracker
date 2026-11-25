import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/redis', () => ({ getRedisClient: () => null }));
vi.mock('@/lib/ops/metrics', () => ({ incr: vi.fn() }));

import {
    checkDailyLimit,
    checkRateLimit,
    DAILY_LIMITS,
    isFailClosedScope,
} from '../rate-limit';

const base = { userId: 'u1', limit: 5, windowSeconds: 60 };

describe('fail-closed scopes without Redis in production', () => {
    beforeEach(() => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL_ENV', 'production');
    });

    afterEach(() => vi.unstubAllEnvs());

    it.each([
        'assistant-chat',
        'ai-credentials',
        'mcp',
        'content-import-ai-map',
        'content-copy',
        'template-publish',
        'campaign-create',
    ])('%s answers unavailable', async (scope) => {
        const r = await checkRateLimit({ ...base, scope });

        expect(r.allowed).toBe(false);
        expect(r.unavailable).toBe(true);
    });

    it('cheap scopes stay fail-open', async () => {
        const r = await checkRateLimit({ ...base, scope: 'soundboard-play' });

        expect(r.allowed).toBe(true);
        expect(isFailClosedScope('soundboard-play')).toBe(false);
    });

    it('an explicit failClosed:false wins over the scope default', async () => {
        const r = await checkRateLimit({
            ...base,
            scope: 'assistant-chat',
            failClosed: false,
        });

        expect(r.allowed).toBe(true);
    });
});

describe('checkDailyLimit', () => {
    it('blocks the N+1 call of the day', async () => {
        const { limit } = DAILY_LIMITS.templatePublish;

        for (let i = 0; i < limit; i++)
            expect(await checkDailyLimit('daily-user', 'templatePublish')).toBe(
                null
            );

        const blocked = await checkDailyLimit('daily-user', 'templatePublish');

        expect(blocked?.status).toBe(429);
    });
});
