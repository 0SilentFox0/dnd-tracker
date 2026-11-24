import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { collectDbGauges, evaluateAlerts, flushMetrics, gauge, rollupAndPrune } =
    vi.hoisted(() => ({
        collectDbGauges: vi.fn(),
        evaluateAlerts: vi.fn(),
        flushMetrics: vi.fn(),
        gauge: vi.fn(),
        rollupAndPrune: vi.fn(),
    }));

vi.mock('@/lib/server/ops/collect-db', () => ({ collectDbGauges }));
vi.mock('@/lib/server/ops/evaluate', () => ({ evaluateAlerts }));
vi.mock('@/lib/server/ops/metrics', () => ({ flushMetrics, gauge }));
vi.mock('@/lib/server/ops/rollup', () => ({ rollupAndPrune }));
vi.mock('@/lib/server/ops/adapters', () => ({
    PROVIDER_ADAPTERS: [
        {
            name: 'cloudflare',
            collect: async () => [{ metric: 'requests_day', value: 5 }],
        },
        { name: 'pusher', collect: async () => 'unavailable' },
    ],
}));

import { POST } from '../route';

const call = (token?: string) =>
    POST(
        new Request('http://x/api/ops/collect', {
            method: 'POST',
            headers: token ? { authorization: `Bearer ${token}` } : {},
        })
    );

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OPS_COLLECT_SECRET', 's3cret');
    collectDbGauges.mockResolvedValue(undefined);
    evaluateAlerts.mockResolvedValue({ evaluated: 3, notified: 1 });
});

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/ops/collect', () => {
    it('503 without a configured secret', async () => {
        vi.stubEnv('OPS_COLLECT_SECRET', '');

        expect((await call('x')).status).toBe(503);
    });

    it('401 with a wrong or missing secret', async () => {
        expect((await call('nope')).status).toBe(401);
        expect((await call()).status).toBe(401);
        expect(collectDbGauges).not.toHaveBeenCalled();
    });

    it('200 with adapter statuses and heartbeat', async () => {
        const res = await call('s3cret');

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            ok: true,
            adapters: { cloudflare: 'ok', pusher: 'unavailable' },
            evaluated: 3,
            notified: 1,
        });
        expect(gauge).toHaveBeenCalledWith(
            'provider.cloudflare.requests_day',
            5
        );
        expect(gauge).toHaveBeenCalledWith(
            'collector.heartbeat',
            expect.any(Number)
        );
        expect(flushMetrics).toHaveBeenCalled();
    });
});
