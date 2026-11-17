import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const auth = vi.hoisted(() => ({
    requireDM: vi.fn(),
    requireCampaignAccess: vi.fn(),
}));

vi.mock('@/lib/utils/api/api-auth', () => auth);

const service = vi.hoisted(() => ({
    getTileChunks: vi.fn(),
    patchTileChunks: vi.fn(),
}));

vi.mock('@/lib/server/battle-maps/tiles-service', () => service);

const library = vi.hoisted(() => ({
    getMapMeta: vi.fn(),
}));

vi.mock('@/lib/server/battle-maps/library-service', () => library);

const limits = vi.hoisted(() => ({ campaignMapMaxSide: vi.fn() }));

vi.mock('@/lib/server/battle-maps/campaign-limits', () => limits);

const access = vi.hoisted(() => ({ requireMapReadAccess: vi.fn() }));

vi.mock('@/lib/server/battle-maps/player-access', () => access);

import { GET, PUT } from '../route';

const ctx = { params: Promise.resolve({ id: 'c1', mapId: 'm1' }) };

const meta = { campaignId: 'c1', version: 2, cols: 20, rows: 20 };

const request = (method: string, body?: unknown, query = '') =>
    new Request(`http://local/maps/m1/tiles${query}`, {
        method,
        headers:
            body === undefined
                ? undefined
                : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

beforeEach(() => {
    vi.clearAllMocks();
    auth.requireDM.mockResolvedValue({ isDM: true });
    auth.requireCampaignAccess.mockResolvedValue({ isDM: false });
    library.getMapMeta.mockResolvedValue(meta);
    access.requireMapReadAccess.mockResolvedValue(null);
    limits.campaignMapMaxSide.mockResolvedValue(200);
    service.getTileChunks.mockResolvedValue({ ground: {} });
    service.patchTileChunks.mockResolvedValue(3);
});

describe('tile chunk API', () => {
    it('reads versioned tile chunks for a campaign member', async () => {
        const response = await GET(request('GET'), ctx);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            version: 2,
            chunks: { ground: {} },
        });
        expect(service.getTileChunks).toHaveBeenCalledWith('m1', 2);
    });

    it('hides tile chunks from a player without a battle on the map', async () => {
        access.requireMapReadAccess.mockResolvedValueOnce(
            NextResponse.json({}, { status: 403 })
        );

        expect((await GET(request('GET'), ctx)).status).toBe(403);
        expect(service.getTileChunks).not.toHaveBeenCalled();
    });

    it('tiles of another campaign map are 403', async () => {
        library.getMapMeta.mockResolvedValueOnce({ ...meta, campaignId: 'x' });

        expect((await GET(request('GET'), ctx)).status).toBe(403);
        expect(service.getTileChunks).not.toHaveBeenCalled();
    });

    it('requires map library flag, DM access, and valid bounded patches to write', async () => {
        limits.campaignMapMaxSide.mockResolvedValueOnce(60);
        expect(
            (
                await PUT(
                    request('PUT', { expectedVersion: 2, patches: [] }),
                    ctx
                )
            ).status
        ).toBe(403);
        expect(service.patchTileChunks).not.toHaveBeenCalled();

        limits.campaignMapMaxSide.mockResolvedValue(200);

        const invalid = await PUT(
            request('PUT', {
                expectedVersion: 2,
                patches: [{ layer: 'unknown' }],
            }),
            ctx
        );

        expect(invalid.status).toBe(400);

        const ok = await PUT(
            request('PUT', {
                expectedVersion: 2,
                patches: [{ layer: 'ground', cx: 0, cy: 0, data: null }],
            }),
            ctx
        );

        expect(ok.status).toBe(200);
        expect(await ok.json()).toEqual({ version: 3 });
        expect(service.patchTileChunks).toHaveBeenCalledWith('m1', 2, [
            { layer: 'ground', cx: 0, cy: 0, data: null },
        ]);
    });

    it('returns access responses and version conflicts unchanged', async () => {
        auth.requireCampaignAccess.mockResolvedValueOnce(
            NextResponse.json({}, { status: 403 })
        );
        expect((await GET(request('GET'), ctx)).status).toBe(403);

        const { ContentError } = await import('@/lib/server/content/errors');

        service.patchTileChunks.mockRejectedValueOnce(
            new ContentError('errors.battleMapConflict', 409)
        );

        const response = await PUT(
            request('PUT', {
                expectedVersion: 2,
                patches: [{ layer: 'ground', cx: 0, cy: 0, data: null }],
            }),
            ctx
        );

        expect(response.status).toBe(409);
    });
});
