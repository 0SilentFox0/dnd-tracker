import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAP_LIMITS } from '@/lib/constants/map-limits';

const ticket = vi.hoisted(() => vi.fn());

const rate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/battle-maps/background-upload', () => ({
    createBattleMapBackgroundUploadTicket: ticket,
}));
vi.mock('@/lib/utils/api/as-dm', () => ({
    withDM: (
        _id: string,
        _action: string,
        handler: (access: { userId: string }) => unknown
    ) => handler({ userId: 'u1' }),
}));
vi.mock('@/lib/utils/api/rate-limit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/utils/api/rate-limit')>()),
    checkRateLimit: rate,
}));

import { POST } from '../route';

const rawRequest = (body: string) =>
    new Request('https://app.test/api/campaigns/c/maps/background-upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
    });

const call = (body: unknown) =>
    POST(rawRequest(JSON.stringify(body)), {
        params: Promise.resolve({ id: 'c' }),
    });

describe('battle map background upload ticket', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        rate.mockResolvedValue({ allowed: true });
    });

    it('answers 429 and issues no ticket once the rate limit is exhausted', async () => {
        rate.mockResolvedValue({
            allowed: false,
            retryAfterSeconds: 30,
            count: 21,
            limit: 20,
        });

        const response = await call({ size: 100, contentType: 'image/png' });

        expect(response.status).toBe(429);
        expect(ticket).not.toHaveBeenCalled();
    });

    it('returns the ticket issued for the campaign and content type', async () => {
        ticket.mockImplementation(async (campaignId: string, type: string) => ({
            ok: true,
            value: { bucket: 'battle-maps', path: `${campaignId}/${type}` },
        }));

        const response = await call({ size: 100, contentType: 'image/webp' });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            bucket: 'battle-maps',
            path: 'c/image/webp',
        });
    });

    it('accepts an upload exactly at the size limit', async () => {
        ticket.mockResolvedValue({ ok: true, value: { path: 'p' } });

        const response = await call({
            size: MAP_LIMITS.backgroundUploadBytes,
            contentType: 'image/png',
        });

        expect(response.status).toBe(200);
    });

    it.each([
        ['unsupported format', { size: 100, contentType: 'image/gif' }],
        [
            'oversized upload',
            {
                size: MAP_LIMITS.backgroundUploadBytes + 1,
                contentType: 'image/png',
            },
        ],
        ['zero size', { size: 0, contentType: 'image/png' }],
        ['fractional size', { size: 1.5, contentType: 'image/png' }],
        ['missing type', { size: 100 }],
    ])('rejects %s with 400 and issues no ticket', async (_name, body) => {
        const response = await call(body);

        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe(API_ERRORS.INVALID_BODY);
        expect(ticket).not.toHaveBeenCalled();
    });

    it('rejects malformed JSON with 400', async () => {
        const response = await POST(rawRequest('{nope'), {
            params: Promise.resolve({ id: 'c' }),
        });

        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe(API_ERRORS.INVALID_JSON);
    });

    it('surfaces a storage failure as 500 with its message', async () => {
        ticket.mockResolvedValue({ ok: false, message: 'storage down' });

        const response = await call({ size: 100, contentType: 'image/png' });

        expect(response.status).toBe(500);
        expect((await response.json()).error).toBe('storage down');
    });
});
