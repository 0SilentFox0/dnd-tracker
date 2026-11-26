import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => {
    const state = { art: null as Record<string, unknown> | null };

    const tx = {
        $queryRaw: vi.fn(async () => []),
        battleMapArt: {
            findUnique: vi.fn(async () => state.art),
            upsert: vi.fn(
                async (args: {
                    create: Record<string, unknown>;
                    update: Record<string, unknown>;
                }) => {
                    state.art = state.art
                        ? { ...state.art, ...args.update }
                        : {
                              bakedSceneVersion: null,
                              bakedUrl: null,
                              bakedAt: null,
                              ...args.create,
                          };

                    return state.art;
                }
            ),
        },
        battleMap: {
            findUniqueOrThrow: vi.fn(async () => ({
                header: { cols: 20, rows: 20, background: 'https://cdn/b.webp' },
            })),
        },
    };

    return {
        state,
        tx,
        saveMapTx: vi.fn(),
        cleanup: vi.fn(),
        prisma: {
            $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => {
                const snapshot = state.art && { ...state.art };

                try {
                    return await fn(tx);
                } catch (e) {
                    state.art = snapshot;

                    throw e;
                }
            }),
            battleMapArt: { deleteMany: vi.fn(), findUnique: vi.fn() },
        },
    };
});

vi.mock('@/lib/db', () => ({ prisma: h.prisma }));

vi.mock('@/lib/server/battle-maps/library-service', () => ({
    saveMapTx: h.saveMapTx,
}));

vi.mock('@/lib/server/battle-maps/background-cleanup', () => ({
    removeUnreferencedBackgrounds: h.cleanup,
}));

import { deleteArt, getArt, saveArt } from '../art-service';

import { ContentError } from '@/lib/server/content/errors';
import type { MapArtScene } from '@/types/battle-map';

const scene = (darkness = 0): MapArtScene => ({
    v: 1,
    floors: {},
    walls: {},
    openings: {},
    blocked: {},
    lights: [],
    ambient: { tint: '#000000', darkness },
    stamps: [],
});

const save = {
    name: 'M',
    map: { cols: 20, rows: 20, background: 'https://cdn/b.webp' },
    walls: ['0:0:e'],
    bars: [],
    expectedVersion: 1,
} as never;

const run = (over: { scene?: MapArtScene; expected?: number; baked?: boolean }) =>
    saveArt('m1', {
        save,
        scene: over.scene ?? scene(),
        expectedSceneVersion: over.expected ?? 0,
        baked: over.baked ?? false,
    });

beforeEach(() => {
    vi.clearAllMocks();
    h.state.art = null;
    h.saveMapTx.mockResolvedValue({
        brief: { id: 'm1', version: 2 },
        released: { campaignId: 'c1', urls: [null] },
    });
});

describe('saveArt', () => {
    it('creates the row at sceneVersion 1', async () => {
        const r = await run({});

        expect(r.art.sceneVersion).toBe(1);
        expect(r.art.bakedSceneVersion).toBeNull();
        expect(r.patch.walls).toEqual(['0:0:e']);
        expect(h.cleanup).toHaveBeenCalledWith('c1', [null]);
    });

    it('rejects a stale expectedSceneVersion with 409', async () => {
        await run({});

        await expect(run({})).rejects.toMatchObject({ status: 409 });
        await expect(run({})).rejects.toBeInstanceOf(ContentError);
    });

    it('keeps sceneVersion for the same scene and marks it baked', async () => {
        await run({});

        const r = await run({ expected: 1, baked: true });

        expect(r.art.sceneVersion).toBe(1);
        expect(r.art.bakedSceneVersion).toBe(1);
        expect(r.art.bakedUrl).toBe('https://cdn/b.webp');
        expect(h.saveMapTx).toHaveBeenLastCalledWith(
            h.tx,
            'm1',
            save,
            { artBaked: true }
        );
    });

    it('bumps sceneVersion on change and keeps the old baked mark', async () => {
        await run({});
        await run({ expected: 1, baked: true });

        const r = await run({ expected: 1, scene: scene(0.5) });

        expect(r.art.sceneVersion).toBe(2);
        expect(r.art.bakedSceneVersion).toBe(1);
    });

    it('leaves the art row untouched when the map save conflicts', async () => {
        await run({});

        const before = { ...h.state.art };

        h.saveMapTx.mockRejectedValueOnce(new ContentError('x', 409));

        await expect(
            run({ expected: 1, scene: scene(0.5) })
        ).rejects.toMatchObject({ status: 409 });

        expect(h.state.art).toEqual(before);
        expect(h.cleanup).toHaveBeenCalledTimes(1);
    });
});

describe('getArt / deleteArt', () => {
    it('returns an empty record when no row exists', async () => {
        h.prisma.battleMapArt.findUnique.mockResolvedValueOnce(null);

        expect(await getArt('m1')).toMatchObject({
            scene: null,
            sceneVersion: 0,
        });
    });

    it('deletes by map id', async () => {
        await deleteArt('m1');

        expect(h.prisma.battleMapArt.deleteMany).toHaveBeenCalledWith({
            where: { mapId: 'm1' },
        });
    });
});
