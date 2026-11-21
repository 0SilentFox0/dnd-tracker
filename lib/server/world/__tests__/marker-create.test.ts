import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => {
    const tx = { worldMarker: { aggregate: vi.fn(), create: vi.fn() } };

    return {
        tx,
        lockWorldMap: vi.fn(),
        transaction: vi.fn(),
        aggregateOutside: vi.fn(),
        createOutside: vi.fn(),
        updateOutside: vi.fn(),
        findLayer: vi.fn(),
    };
});

vi.mock('@/lib/db', () => ({
    prisma: {
        $transaction: m.transaction,
        worldMarker: {
            aggregate: m.aggregateOutside,
            create: m.createOutside,
            update: m.updateOutside,
        },
        worldLayer: { findFirst: m.findLayer },
    },
}));
vi.mock('@/lib/server/world/lock', () => ({ lockWorldMap: m.lockWorldMap }));
vi.mock('@/lib/server/world/map-handlers', () => ({
    ownedMap: vi.fn().mockResolvedValue({ id: 'map1' }),
    ownedMarker: vi
        .fn()
        .mockResolvedValue({ id: 'k1', mapId: 'map1', kind: 'point' }),
}));
vi.mock('@/lib/server/world/map-store', () => ({
    toWorldMarker: (v: unknown) => v,
}));
vi.mock('@/lib/server/world/world-events', () => ({
    publishWorldChanged: vi.fn(),
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
    createWorldMarkerHandler,
    updateWorldMarkerHandler,
} from '../marker-handlers';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_MARKERS_PER_MAP } from '@/lib/constants/world';

const req = (extra: Record<string, unknown> = {}) =>
    new Request('http://localhost/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            mapId: 'map1',
            kind: 'point',
            x: 0.1,
            y: 0.2,
            name: 'A',
            ...extra,
        }),
    });

describe('updateWorldMarkerHandler layerId', () => {
    it('answers 404 for a layer of another map', async () => {
        m.findLayer.mockResolvedValue(null);

        const res = await updateWorldMarkerHandler(
            new Request('http://localhost/x', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ layerId: 'x' }),
            }),
            'c1',
            'k1'
        );

        expect(res.status).toBe(404);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_LAYER_NOT_FOUND);
        expect(m.updateOutside).not.toHaveBeenCalled();
    });
});

describe('updateWorldMarkerHandler style', () => {
    const patch = (body: unknown) =>
        updateWorldMarkerHandler(
            new Request('http://localhost/x', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            }),
            'c1',
            'k1'
        );

    beforeEach(() => {
        vi.clearAllMocks();
        m.updateOutside.mockResolvedValue({});
    });

    it('passes labelMode and fillOpacity', async () => {
        await patch({ labelMode: 'always', fillOpacity: 0.3 });

        expect(m.updateOutside.mock.calls[0][0].data).toMatchObject({
            labelMode: 'always',
            fillOpacity: 0.3,
        });
    });

    it('null resets labelMode, icon and color', async () => {
        await patch({ labelMode: null, icon: null, color: null });

        expect(m.updateOutside.mock.calls[0][0].data).toMatchObject({
            labelMode: null,
            icon: null,
            color: null,
        });
    });

    it('rejects an unknown labelMode', async () => {
        expect((await patch({ labelMode: 'x' })).status).toBe(400);
    });

    it('null resets fillOpacity', async () => {
        await patch({ fillOpacity: null });

        expect(m.updateOutside.mock.calls[0][0].data).toMatchObject({
            fillOpacity: null,
        });
    });

    it.each([0.05, 1.2])('rejects fillOpacity %s', async (fillOpacity) => {
        expect((await patch({ fillOpacity })).status).toBe(400);
    });

    it('rejects an unknown icon key', async () => {
        expect((await patch({ icon: 'not-an-icon' })).status).toBe(400);
    });
});

describe('createWorldMarkerHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        m.transaction.mockImplementation((fn: (tx: typeof m.tx) => unknown) =>
            fn(m.tx)
        );
        m.tx.worldMarker.aggregate.mockResolvedValue({
            _count: 2,
            _max: { sortOrder: 4 },
        });
        m.tx.worldMarker.create.mockImplementation(
            ({ data }: { data: unknown }) => Promise.resolve(data)
        );
    });

    it('locks the map and counts inside one transaction', async () => {
        const res = await createWorldMarkerHandler(req(), 'c1');

        expect(res.status).toBe(201);
        expect(m.lockWorldMap).toHaveBeenCalledWith(m.tx, 'map1');
        expect(m.lockWorldMap.mock.invocationCallOrder[0]).toBeLessThan(
            m.tx.worldMarker.aggregate.mock.invocationCallOrder[0]
        );
        expect(m.tx.worldMarker.create.mock.calls[0][0].data.sortOrder).toBe(5);
        expect(m.aggregateOutside).not.toHaveBeenCalled();
    });

    it('answers 409 at the limit without creating', async () => {
        m.tx.worldMarker.aggregate.mockResolvedValue({
            _count: MAX_MARKERS_PER_MAP,
            _max: { sortOrder: 9 },
        });

        const res = await createWorldMarkerHandler(req(), 'c1');

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_MARKERS_LIMIT);
        expect(m.tx.worldMarker.create).not.toHaveBeenCalled();
    });

    it('stores layerId of a layer on the same map', async () => {
        m.findLayer.mockResolvedValue({ id: 'l1' });

        const res = await createWorldMarkerHandler(
            req({ layerId: 'l1' }),
            'c1'
        );

        expect(res.status).toBe(201);
        expect(m.findLayer).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'l1', mapId: 'map1' } })
        );
        expect(m.tx.worldMarker.create.mock.calls[0][0].data.layerId).toBe(
            'l1'
        );
    });

    it('stores a zone without color as null and keeps style fields', async () => {
        const poly = [
            [0.1, 0.1],
            [0.4, 0.1],
            [0.3, 0.4],
        ];

        await createWorldMarkerHandler(
            req({
                kind: 'zone',
                polygon: poly,
                labelMode: 'hidden',
                fillOpacity: 0.5,
            }),
            'c1'
        );

        expect(m.tx.worldMarker.create.mock.calls[0][0].data).toMatchObject({
            color: null,
            labelMode: 'hidden',
            fillOpacity: 0.5,
        });
    });

    it('answers 404 for a layer of another map', async () => {
        m.findLayer.mockResolvedValue(null);

        const res = await createWorldMarkerHandler(req({ layerId: 'x' }), 'c1');

        expect(res.status).toBe(404);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_LAYER_NOT_FOUND);
        expect(m.tx.worldMarker.create).not.toHaveBeenCalled();
    });
});
