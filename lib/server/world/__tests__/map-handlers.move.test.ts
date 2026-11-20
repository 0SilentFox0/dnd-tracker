import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    mapFindUnique: vi.fn(),
    markerFindUnique: vi.fn(),
    mapFindMany: vi.fn(),
    mapUpdate: vi.fn(),
    lock: vi.fn(),
}));

const tx = vi.hoisted(() => ({}) as Record<string, unknown>);

vi.mock('@/lib/db', () => {
    const client = {
        worldMap: {
            findUnique: m.mapFindUnique,
            findMany: m.mapFindMany,
            update: m.mapUpdate,
            count: vi.fn().mockResolvedValue(1),
        },
        worldMarker: { findUnique: m.markerFindUnique },
        $executeRaw: m.lock,
    };

    Object.assign(tx, client);

    return {
        prisma: {
            ...client,
            $transaction: (fn: (t: unknown) => unknown) => fn(tx),
        },
    };
});
vi.mock('@/lib/server/world/map-store', () => ({
    toWorldMap: (v: unknown) => v,
    listWorldMaps: vi.fn(),
    orphanedImagesOfSubtree: vi.fn(),
    readWorldMapDetail: vi.fn(),
}));
vi.mock('@/lib/server/world/world-events', () => ({
    publishWorldChanged: vi.fn(),
}));
vi.mock('@/lib/server/show/show-store', () => ({ clearShowWorld: vi.fn() }));
vi.mock('@/lib/server/world/note-store', () => ({}));
vi.mock('@/lib/server/world/travel-store', () => ({}));
vi.mock('@/lib/supabase/world-map-storage', () => ({
    ownedWorldMapPath: vi.fn(() => true),
    removeWorldMapFiles: vi.fn(),
}));
vi.mock('@/lib/utils/api/as-dm', async () => {
    const { handleApiError } = await import('@/lib/utils/api/error-handler');

    return {
        withDM: async (
            _c: string,
            action: string,
            run: () => Promise<NextResponse>
        ) => run().catch((e) => handleApiError(e, { action })),
    };
});

import { updateWorldMapHandler } from '../map-handlers';

import { API_ERRORS } from '@/lib/constants/api-errors';

const req = (body: unknown) =>
    new Request('http://localhost/x', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });

const mapRow = (parentMarkerId: string | null) => ({
    id: 'B',
    campaignId: 'c1',
    imageUrl: 'u',
    parentMarkerId,
});

const marker = (over: Record<string, unknown> = {}) => ({
    id: 'm2',
    mapId: 'A',
    map: { campaignId: 'c1' },
    childMap: null,
    ...over,
});

const call = () =>
    updateWorldMapHandler(req({ parentMarkerId: 'm2' }), 'c1', 'B');

describe('updateWorldMapHandler re-parenting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        m.mapFindUnique.mockResolvedValue(mapRow('m1'));
        m.markerFindUnique.mockResolvedValue(marker());
        m.mapFindMany.mockResolvedValue([
            { id: 'A', parentMarker: null },
            { id: 'B', parentMarker: { mapId: 'A' } },
        ]);
        m.mapUpdate.mockImplementation(({ data }: { data: unknown }) =>
            Promise.resolve({ id: 'B', ...(data as object) })
        );
    });

    it('moves a nested map to a free marker', async () => {
        const res = await call();

        expect(res.status).toBe(200);
        expect(m.mapUpdate.mock.calls[0][0].data).toEqual({
            parentMarkerId: 'm2',
        });
    });

    it('takes the per-campaign advisory lock before checking the move', async () => {
        await call();

        expect(m.lock).toHaveBeenCalledTimes(1);
        expect(m.lock.mock.calls[0][0].join('')).toContain(
            'pg_advisory_xact_lock(hashtext('
        );
    });

    it('rejects a marker inside the map own subtree', async () => {
        m.markerFindUnique.mockResolvedValue(marker({ mapId: 'B' }));

        const res = await call();

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_MOVE_CYCLE);
        expect(m.mapUpdate).not.toHaveBeenCalled();
    });

    it('rejects a marker inside a descendant of the map', async () => {
        m.mapFindMany.mockResolvedValue([
            { id: 'A', parentMarker: null },
            { id: 'B', parentMarker: { mapId: 'A' } },
            { id: 'C', parentMarker: { mapId: 'B' } },
        ]);
        m.markerFindUnique.mockResolvedValue(marker({ mapId: 'C' }));

        const res = await call();

        expect((await res.json()).error).toBe(API_ERRORS.WORLD_MOVE_CYCLE);
    });

    it('rejects a marker that already has another nested map', async () => {
        m.markerFindUnique.mockResolvedValue(marker({ childMap: { id: 'X' } }));

        const res = await call();

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_NESTED_EXISTS);
    });

    it('rejects moving the root map', async () => {
        m.mapFindUnique.mockResolvedValue(mapRow(null));

        const res = await call();

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(
            API_ERRORS.WORLD_ROOT_IMMOVABLE
        );
    });

    it('rejects a marker of another campaign', async () => {
        m.markerFindUnique.mockResolvedValue(
            marker({ map: { campaignId: 'other' } })
        );

        const res = await call();

        expect([403, 404]).toContain(res.status);
        expect(m.mapUpdate).not.toHaveBeenCalled();
    });

    it('answers 409 when a concurrent move wins (P2002)', async () => {
        m.mapUpdate.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('dup', {
                code: 'P2002',
                clientVersion: 'x',
            })
        );

        const res = await call();

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_NESTED_EXISTS);
    });
});
