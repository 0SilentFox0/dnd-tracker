import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => {
    const db = {
        worldLayer: {
            aggregate: vi.fn(),
            create: vi.fn(),
            findUnique: vi.fn(),
            findUniqueOrThrow: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        worldMarker: {
            findMany: vi.fn(),
            updateMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        worldLayerHero: { deleteMany: vi.fn(), createMany: vi.fn() },
        character: { count: vi.fn() },
        $transaction: vi.fn(),
    };

    return {
        db,
        ownedMap: vi.fn(),
        clearShow: vi.fn(),
        publish: vi.fn(),
        inUse: vi.fn(),
        removeFiles: vi.fn(),
    };
});

vi.mock('@/lib/db', () => ({ prisma: m.db }));
vi.mock('@/lib/server/world/map-handlers', () => ({
    ownedMap: m.ownedMap,
    clearShowAfterDelete: m.clearShow,
}));
vi.mock('@/lib/server/world/world-events', () => ({
    publishWorldChanged: m.publish,
}));
vi.mock('@/lib/supabase/world-map-storage', () => ({
    ownedWorldMapPath: () => true,
    removeWorldMapFiles: m.removeFiles,
}));
vi.mock('@/lib/server/world/map-store', () => ({
    worldImageInUse: m.inUse,
}));
vi.mock('next/server', async (orig) => ({
    ...(await orig<typeof import('next/server')>()),
    after: (fn: () => unknown) => fn(),
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

import {
    layerCreateHandler,
    layerDeleteHandler,
    layerHeroesHandler,
    layerPatchHandler,
    layersListHandler,
} from '../layer-handlers';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_WORLD_LAYERS } from '@/lib/constants/world';

const row = (over: Record<string, unknown> = {}) => ({
    id: 'l1',
    mapId: 'map1',
    name: 'Fog',
    color: null,
    visibility: 'dm',
    sortOrder: 0,
    imageUrl: null,
    imgX: 0,
    imgY: 0,
    imgW: 1,
    imgH: 1,
    opacity: 1,
    icon: null,
    zoneOpacity: null,
    zoneLabels: null,
    heroes: [],
    map: { campaignId: 'c1' },
    ...over,
});

const json = (body: unknown, method = 'POST') =>
    new Request('http://localhost/x', {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });

const del = (query = '') =>
    new Request(`http://localhost/x${query}`, { method: 'DELETE' });

beforeEach(() => {
    vi.clearAllMocks();
    m.ownedMap.mockResolvedValue({ id: 'map1', campaignId: 'c1' });
    m.db.worldLayer.findUnique.mockResolvedValue(row());
    m.db.$transaction.mockImplementation((fn: (tx: typeof m.db) => unknown) =>
        fn(m.db)
    );
});

describe('layerCreateHandler', () => {
    it('creates a dm-only layer with the next sort order', async () => {
        m.db.worldLayer.aggregate.mockResolvedValue({
            _count: 1,
            _max: { sortOrder: 3 },
        });
        m.db.worldLayer.create.mockResolvedValue(row({ sortOrder: 4 }));

        const res = await layerCreateHandler(
            json({ mapId: 'map1', name: 'Fog' }),
            'c1',
            'map1'
        );

        expect(res.status).toBe(201);

        const data = m.db.worldLayer.create.mock.calls[0][0].data;

        expect(data).toMatchObject({ visibility: 'dm', sortOrder: 4 });
        expect(m.publish).toHaveBeenCalledWith('c1', 'map1');
    });

    it('answers 409 at the limit', async () => {
        m.db.worldLayer.aggregate.mockResolvedValue({
            _count: MAX_WORLD_LAYERS,
            _max: { sortOrder: 3 },
        });

        const res = await layerCreateHandler(
            json({ mapId: 'map1', name: 'Fog' }),
            'c1',
            'map1'
        );

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_LAYER_LIMIT);
        expect(m.db.worldLayer.create).not.toHaveBeenCalled();
    });

    it('returns 404 for a foreign map', async () => {
        m.ownedMap.mockResolvedValue(
            NextResponse.json(
                { error: API_ERRORS.WORLD_MAP_NOT_FOUND },
                { status: 404 }
            )
        );

        const res = await layerCreateHandler(
            json({ mapId: 'map1', name: 'Fog' }),
            'c1',
            'map1'
        );

        expect(res.status).toBe(404);
        expect(m.db.worldLayer.create).not.toHaveBeenCalled();
    });
});

describe('layerPatchHandler style', () => {
    const patch = (body: unknown) =>
        layerPatchHandler(json(body, 'PATCH'), 'c1', 'l1');

    beforeEach(() => {
        m.db.worldLayer.update.mockResolvedValue(
            row({ icon: 'castle', zoneOpacity: 0.4, zoneLabels: 'hidden' })
        );
    });

    it('sets icon, zoneOpacity and zoneLabels', async () => {
        const res = await patch({
            icon: 'castle',
            zoneOpacity: 0.4,
            zoneLabels: 'hidden',
        });

        expect(res.status).toBe(200);
        expect(m.db.worldLayer.update.mock.calls[0][0].data).toMatchObject({
            icon: 'castle',
            zoneOpacity: 0.4,
            zoneLabels: 'hidden',
        });
        expect(await res.json()).toMatchObject({
            icon: 'castle',
            zoneOpacity: 0.4,
            zoneLabels: 'hidden',
        });
    });

    it('resets with null', async () => {
        await patch({ icon: null, zoneOpacity: null });

        expect(m.db.worldLayer.update.mock.calls[0][0].data).toMatchObject({
            icon: null,
            zoneOpacity: null,
        });
    });

    it.each([0.05, 1.2])('rejects zoneOpacity %s', async (zoneOpacity) => {
        expect((await patch({ zoneOpacity })).status).toBe(400);
        expect(m.db.worldLayer.update).not.toHaveBeenCalled();
    });

    it('rejects an unknown icon key', async () => {
        expect((await patch({ icon: 'nope' })).status).toBe(400);
    });
});

describe('layersListHandler', () => {
    it('returns 404 for a foreign map', async () => {
        m.ownedMap.mockResolvedValue(
            NextResponse.json({ error: 'x' }, { status: 404 })
        );

        expect((await layersListHandler('c1', 'map1')).status).toBe(404);
    });
});

describe('layerPatchHandler', () => {
    beforeEach(() => {
        m.db.worldLayer.update.mockResolvedValue(row());
    });

    it('updates visibility, rect and opacity', async () => {
        const res = await layerPatchHandler(
            json(
                {
                    visibility: 'all',
                    rect: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 },
                    opacity: 0.5,
                },
                'PATCH'
            ),
            'c1',
            'l1'
        );

        expect(res.status).toBe(200);
        expect(m.db.worldLayer.update.mock.calls[0][0].data).toEqual({
            visibility: 'all',
            opacity: 0.5,
            imgX: 0.1,
            imgY: 0.2,
            imgW: 0.5,
            imgH: 0.5,
        });
        expect(m.publish).toHaveBeenCalledWith('c1', 'map1');
    });

    it('returns 404 for a layer of another campaign map', async () => {
        m.db.worldLayer.findUnique.mockResolvedValue(null);

        const res = await layerPatchHandler(
            json({ name: 'X' }, 'PATCH'),
            'c1',
            'l1'
        );

        expect(res.status).toBe(404);
    });
});

describe('layerHeroesHandler', () => {
    beforeEach(() => {
        m.db.worldLayer.findUniqueOrThrow.mockResolvedValue(
            row({ heroes: [{ characterId: 'h1' }] })
        );
    });

    it('replaces the hero set in one transaction', async () => {
        m.db.character.count.mockResolvedValue(1);

        const res = await layerHeroesHandler(
            json({ heroIds: ['h1'] }, 'PUT'),
            'c1',
            'l1'
        );

        expect(res.status).toBe(200);
        expect(m.db.$transaction).toHaveBeenCalledTimes(1);
        expect(m.db.worldLayerHero.deleteMany).toHaveBeenCalledWith({
            where: { layerId: 'l1' },
        });
        expect(m.db.worldLayerHero.createMany).toHaveBeenCalledWith({
            data: [{ layerId: 'l1', characterId: 'h1' }],
        });
        expect((await res.json()).heroIds).toEqual(['h1']);
    });

    it('rejects characters outside the campaign', async () => {
        m.db.character.count.mockResolvedValue(0);

        const res = await layerHeroesHandler(
            json({ heroIds: ['foreign'] }, 'PUT'),
            'c1',
            'l1'
        );

        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_LAYER_INVALID);
        expect(m.db.worldLayerHero.deleteMany).not.toHaveBeenCalled();
    });
});

describe('layer image files', () => {
    beforeEach(() => {
        m.db.worldLayer.update.mockResolvedValue(row());
        m.db.worldMarker.findMany.mockResolvedValue([]);
        m.inUse.mockResolvedValue(false);
        m.db.worldLayer.findUnique.mockResolvedValue(
            row({ imageUrl: 'https://x.test/old.png' })
        );
    });

    it('removes the old file when the image is replaced', async () => {
        await layerPatchHandler(
            json({ imageUrl: 'https://x.test/new.png' }, 'PATCH'),
            'c1',
            'l1'
        );

        await vi.waitFor(() =>
            expect(m.removeFiles).toHaveBeenCalledWith('c1', [
                'https://x.test/old.png',
            ])
        );
    });

    it('removes the file when the image is cleared', async () => {
        await layerPatchHandler(json({ imageUrl: null }, 'PATCH'), 'c1', 'l1');

        await vi.waitFor(() =>
            expect(m.removeFiles).toHaveBeenCalledWith('c1', [
                'https://x.test/old.png',
            ])
        );
    });

    it('keeps a file that is still referenced', async () => {
        m.inUse.mockResolvedValue(true);

        await layerPatchHandler(
            json({ imageUrl: 'https://x.test/new.png' }, 'PATCH'),
            'c1',
            'l1'
        );

        await new Promise((r) => setTimeout(r, 10));

        expect(m.removeFiles).not.toHaveBeenCalled();
    });

    it('removes the file when the layer is deleted', async () => {
        await layerDeleteHandler(del(), 'c1', 'l1');

        await vi.waitFor(() =>
            expect(m.removeFiles).toHaveBeenCalledWith('c1', [
                'https://x.test/old.png',
            ])
        );
    });

    it('answers 404 when the layer vanished before the write', async () => {
        m.db.worldLayer.delete.mockRejectedValueOnce(
            Object.assign(
                new Prisma.PrismaClientKnownRequestError('gone', {
                    code: 'P2025',
                    clientVersion: 'x',
                }),
                {}
            )
        );

        const res = await layerDeleteHandler(del(), 'c1', 'l1');

        expect(res.status).toBe(404);
        expect(m.removeFiles).not.toHaveBeenCalled();
    });
});

describe('layerDeleteHandler', () => {
    it('deletes an empty layer at once', async () => {
        m.db.worldMarker.findMany.mockResolvedValue([]);

        const res = await layerDeleteHandler(del(), 'c1', 'l1');

        expect(res.status).toBe(200);
        expect(m.db.worldLayer.delete).toHaveBeenCalledWith({
            where: { id: 'l1' },
        });
    });

    it('answers 409 when markers exist and no mode is given', async () => {
        m.db.worldMarker.findMany.mockResolvedValue([
            { id: 'k1', childMap: null },
        ]);

        const res = await layerDeleteHandler(del(), 'c1', 'l1');

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(
            API_ERRORS.WORLD_LAYER_HAS_MARKERS
        );
        expect(m.db.worldLayer.delete).not.toHaveBeenCalled();
        expect(m.db.worldMarker.updateMany).not.toHaveBeenCalled();
    });

    it('ungroups markers before deleting', async () => {
        m.db.worldMarker.findMany.mockResolvedValue([
            { id: 'k1', childMap: null },
        ]);

        const res = await layerDeleteHandler(
            del('?markers=ungroup'),
            'c1',
            'l1'
        );

        expect(res.status).toBe(200);
        expect(m.db.worldMarker.updateMany).toHaveBeenCalledWith({
            where: { layerId: 'l1' },
            data: { layerId: null },
        });
        expect(
            m.db.worldMarker.updateMany.mock.invocationCallOrder[0]
        ).toBeLessThan(m.db.worldLayer.delete.mock.invocationCallOrder[0]);
    });

    it('deletes markers and clears the show', async () => {
        m.db.worldMarker.findMany.mockResolvedValue([
            { id: 'k1', childMap: null },
        ]);

        const res = await layerDeleteHandler(
            del('?markers=delete'),
            'c1',
            'l1'
        );

        expect(res.status).toBe(200);
        expect(m.db.worldMarker.deleteMany).toHaveBeenCalledWith({
            where: { layerId: 'l1' },
        });
        expect(m.clearShow).toHaveBeenCalledWith('c1', {
            mapIds: [],
            markerIds: ['k1'],
        });
    });

    it('refuses bulk delete when a marker has a nested map', async () => {
        m.db.worldMarker.findMany.mockResolvedValue([
            { id: 'k1', childMap: { id: 'm2' } },
        ]);

        const res = await layerDeleteHandler(
            del('?markers=delete'),
            'c1',
            'l1'
        );

        expect(res.status).toBe(409);
        expect(m.db.worldMarker.deleteMany).not.toHaveBeenCalled();
    });
});
