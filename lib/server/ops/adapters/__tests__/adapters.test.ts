import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/pusher/server', () => ({ pusherServer: { get: getMock } }));

import { PROVIDER_ADAPTERS } from '@/lib/server/ops/adapters';
import { cloudflareAdapter } from '@/lib/server/ops/adapters/cloudflare';
import { pusherAdapter } from '@/lib/server/ops/adapters/pusher';

const CF = [
    'OPS_CLOUDFLARE_API_TOKEN',
    'OPS_CLOUDFLARE_ACCOUNT_ID',
    'OPS_CLOUDFLARE_WORKER_NAME',
];

function setCf() {
    process.env.OPS_CLOUDFLARE_API_TOKEN = 't';
    process.env.OPS_CLOUDFLARE_ACCOUNT_ID = 'a';
    process.env.OPS_CLOUDFLARE_WORKER_NAME = 'w';
}

describe('cloudflare adapter', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        for (const key of CF) delete process.env[key];
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        for (const key of CF) delete process.env[key];
    });

    it('is unavailable without env', async () => {
        expect(await cloudflareAdapter.collect()).toBe('unavailable');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sums requests and errors', async () => {
        setCf();
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                data: {
                    viewer: {
                        accounts: [
                            {
                                workersInvocationsAdaptive: [
                                    { sum: { requests: 10, errors: 1 } },
                                    { sum: { requests: 5, errors: 0 } },
                                ],
                            },
                        ],
                    },
                },
            }),
        });

        expect(await cloudflareAdapter.collect()).toEqual([
            { metric: 'requests_day', value: 15 },
            { metric: 'errors_day', value: 1 },
        ]);
    });

    it('is unavailable on graphql errors and network failure', async () => {
        setCf();
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ errors: [{}] }),
        });
        expect(await cloudflareAdapter.collect()).toBe('unavailable');

        fetchMock.mockRejectedValueOnce(new Error('net'));
        expect(await cloudflareAdapter.collect()).toBe('unavailable');
    });
});

describe('pusher adapter', () => {
    beforeEach(() => {
        getMock.mockReset();
        process.env.PUSHER_APP_ID = 'id';
        process.env.PUSHER_SECRET = 's';
    });

    afterEach(() => {
        delete process.env.PUSHER_APP_ID;
        delete process.env.PUSHER_SECRET;
    });

    it('is unavailable without env', async () => {
        delete process.env.PUSHER_APP_ID;
        expect(await pusherAdapter.collect()).toBe('unavailable');
    });

    it('counts occupied channels', async () => {
        getMock.mockResolvedValue({
            ok: true,
            json: async () => ({ channels: { a: {}, b: {} } }),
        });

        expect(await pusherAdapter.collect()).toEqual([
            { metric: 'channels_occupied', value: 2 },
        ]);
    });

    it('does not throw on failure', async () => {
        getMock.mockRejectedValue(new Error('net'));
        expect(await pusherAdapter.collect()).toBe('unavailable');
    });
});

describe('registry', () => {
    it('lists both adapters', () => {
        expect(PROVIDER_ADAPTERS.map((a) => a.name)).toEqual([
            'cloudflare',
            'pusher',
        ]);
    });
});
