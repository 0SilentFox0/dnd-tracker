import { describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        $transaction: (fn: (tx: unknown) => unknown) =>
            fn({
                worldMarker: {
                    aggregate: async () => ({
                        _count: 0,
                        _max: { sortOrder: null },
                    }),
                    create: m.create,
                },
            }),
    },
}));
vi.mock('../actions/world-service/prepare', () => ({
    requireOwnedMap: vi.fn(),
}));
vi.mock('@/lib/server/world/lock', () => ({ lockWorldMap: vi.fn() }));
vi.mock('@/lib/server/world/map-store', () => ({
    toWorldMarker: (v: unknown) => v,
}));

import { writeMarkersCreate } from '../actions/world-service/writers-markers';

describe('writeMarkersCreate style fields', () => {
    it('writes labelMode and fillOpacity and leaves zone color null', async () => {
        m.create.mockImplementation(({ data }: { data: object }) => ({
            id: 'k1',
            mapId: 'map1',
            name: 'Z',
            ...data,
        }));

        await writeMarkersCreate({
            campaignId: 'c1',
            input: {
                mapId: 'map1',
                kind: 'zone',
                x: 0.2,
                y: 0.2,
                name: 'Z',
                polygon: [
                    [0.1, 0.1],
                    [0.4, 0.1],
                    [0.3, 0.4],
                ],
                labelMode: 'hidden',
                fillOpacity: 0.4,
            },
            emitWorldChanged: vi.fn(),
        } as never);

        expect(m.create.mock.calls[0][0].data).toMatchObject({
            color: null,
            labelMode: 'hidden',
            fillOpacity: 0.4,
        });
    });
});
