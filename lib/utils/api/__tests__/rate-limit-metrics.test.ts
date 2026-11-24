import { afterEach, describe, expect, it, vi } from 'vitest';

const limitMock = vi.fn();

vi.mock('@upstash/ratelimit', () => ({
    Ratelimit: class {
        static slidingWindow() {
            return {};
        }

        limit(...args: unknown[]) {
            return limitMock(...args);
        }
    },
}));
vi.mock('@/lib/redis', () => ({ getRedisClient: vi.fn() }));
vi.mock('@/lib/ops/metrics', () => ({ incr: vi.fn() }));

import { checkRateLimit } from '../rate-limit';

import { incr } from '@/lib/ops/metrics';
import { getRedisClient } from '@/lib/redis';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(incr).mockClear();
    limitMock.mockReset();
    vi.mocked(getRedisClient).mockReset();
});

const base = { userId: 'u', limit: 5, windowSeconds: 10 };

describe('checkRateLimit metrics', () => {
    it('counts denials with a known scope', async () => {
        vi.mocked(getRedisClient).mockReturnValue({} as never);
        limitMock.mockResolvedValue({
            success: false,
            limit: 5,
            remaining: 0,
            reset: Date.now() + 1000,
        });

        await checkRateLimit({ ...base, scope: 'attack' });
        await checkRateLimit({ ...base, scope: 'custom-thing' });

        expect(incr).toHaveBeenCalledWith('ratelimit.denied', 1, {
            scope: 'attack',
        });
        expect(incr).toHaveBeenCalledWith('ratelimit.denied', 1, {
            scope: 'other',
        });
    });

    it('counts degraded open without Redis', async () => {
        vi.mocked(getRedisClient).mockReturnValue(null);

        await checkRateLimit({ ...base, scope: 'attack' });

        expect(incr).toHaveBeenCalledWith('ratelimit.degraded', 1, {
            mode: 'open',
        });
    });

    it('counts degraded closed and not a denial', async () => {
        vi.mocked(getRedisClient).mockReturnValue(null);
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('VERCEL_ENV', 'production');

        const res = await checkRateLimit({
            ...base,
            scope: 'attack',
            failClosed: true,
        });

        expect(res.unavailable).toBe(true);
        expect(incr).toHaveBeenCalledWith('ratelimit.degraded', 1, {
            mode: 'closed',
        });
        expect(incr).not.toHaveBeenCalledWith(
            'ratelimit.denied',
            expect.anything(),
            expect.anything()
        );
    });
});
