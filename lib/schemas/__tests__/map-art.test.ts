import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/constants/map-art/stamps', () => {
    const defs: Record<string, unknown> = {
        deco: { id: 'deco', cols: 1, rows: 1 },
        crate: {
            id: 'crate',
            cols: 1,
            rows: 1,
            blocks: { shape: 'rect', w: 1, h: 1 },
        },
    };

    return {
        stampDef: (id: string) => defs[id],
        isStampId: (id: string) => id in defs,
    };
});

import { MAP_ART_LIMITS, mapArtSaveSchema, mapArtSceneSchema } from '../map-art';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { encodeTileChunk } from '@/lib/utils/battle/tiles/rle';

const scene = (over: object = {}) => ({
    v: 1,
    floors: {},
    walls: {},
    openings: {},
    blocked: {},
    lights: [],
    ambient: { tint: '#000000', darkness: 0 },
    stamps: [],
    ...over,
});

const stamp = (over: object = {}) => ({
    id: 's1',
    asset: 'deco',
    x: 150,
    y: 150,
    rot: 0,
    scale: 1,
    flip: false,
    z: 0,
    ...over,
});

const save = (map: object = {}) => ({
    name: 'Cave',
    map: { cols: 10, rows: 10, background: null, opacity: 0.5, ...map },
    expectedVersion: 1,
});

const body = (sceneOver: object = {}, map: object = {}, extra: object = {}) => ({
    save: save(map),
    scene: scene(sceneOver),
    expectedSceneVersion: 0,
    ...extra,
});

const messages = (input: unknown) => {
    const r = mapArtSaveSchema.safeParse(input);

    return r.success ? [] : r.error.issues.map((i) => i.message);
};

const P = 'maps.editor.art.validation.';

const chunk = (code: number) => encodeTileChunk(new Uint16Array(256).fill(code));

describe('mapArtSceneSchema', () => {
    it('accepts an empty scene', () => {
        expect(mapArtSceneSchema.safeParse(scene()).success).toBe(true);
    });

    it('rejects unknown wall material', () => {
        expect(
            mapArtSceneSchema.safeParse(scene({ walls: { '1:1:e': 'lava' } }))
                .success
        ).toBe(false);
    });

    it('accepts a valid stamp and rejects out-of-range fields', () => {
        const ok = mapArtSceneSchema.safeParse(scene({ stamps: [stamp()] }));

        expect(ok.success).toBe(true);

        for (const bad of [
            { scale: 0.2 },
            { scale: 4.1 },
            { rot: 360 },
            { rot: -1 },
            { z: 1.5 },
            { id: '' },
            { id: 'x'.repeat(41) },
        ])
            expect(
                mapArtSceneSchema.safeParse(scene({ stamps: [stamp(bad)] }))
                    .success
            ).toBe(false);
    });

    it('rejects more than the stamp limit', () => {
        const many = Array.from({ length: MAP_ART_LIMITS.stamps + 1 }, (_, i) =>
            stamp({ id: `s${i}` })
        );

        expect(mapArtSceneSchema.safeParse(scene({ stamps: many })).success).toBe(
            false
        );
    });

    it('keeps the maximum stamp list under the body limit', () => {
        const many = Array.from({ length: MAP_ART_LIMITS.stamps }, (_, i) =>
            stamp({ id: `s${i}`, asset: 'a'.repeat(60) })
        );

        expect(JSON.stringify(many).length).toBeLessThan(
            MAP_ART_LIMITS.bodyBytes
        );
    });

    it('rejects bad light colour and too many lights', () => {
        const light = { id: 'a', x: 0, y: 0, radius: 100, color: '#ffffff', intensity: 1 };

        expect(
            mapArtSceneSchema.safeParse(
                scene({ lights: [{ ...light, color: 'red' }] })
            ).success
        ).toBe(false);
        expect(
            mapArtSceneSchema.safeParse(
                scene({ lights: Array.from({ length: 65 }, () => light) })
            ).success
        ).toBe(false);
    });
});

describe('mapArtSaveSchema', () => {
    it('accepts a valid body', () => {
        expect(messages(body())).toEqual([]);
    });

    it('rejects hex edge key on a square map', () => {
        expect(messages(body({ walls: { '1:1:ne': 'stone' } }))).toContain(
            `${P}badEdge`
        );
    });

    it('rejects opening without wall', () => {
        expect(
            messages(
                body({
                    openings: { '1:1:e': { kind: 'door', material: 'wood' } },
                })
            )
        ).toContain(`${P}openingWithoutWall`);
    });

    it('rejects blocked cell out of bounds', () => {
        expect(messages(body({ blocked: { '12:0': null } }))).toContain(
            `${P}outOfBounds`
        );
    });

    it('rejects object code in a floor chunk', () => {
        expect(messages(body({ floors: { '0:0': chunk(105) } }))).toContain(
            `${P}badFloor`
        );
    });

    it('accepts a floor chunk with floor codes inside bounds only', () => {
        expect(messages(body({ floors: { '0:0': chunk(1) } }))).toContain(
            `${P}outOfBounds`
        );
    });

    it('rejects too many doors', () => {
        const walls: Record<string, string> = {};

        const openings: Record<string, unknown> = {};

        for (let i = 0; i <= MAP_LIMITS.doorsMax; i++) {
            const key = `${i % 100}:${Math.floor(i / 100)}:e`;

            walls[key] = 'stone';
            openings[key] = { kind: 'door', material: 'wood' };
        }

        expect(
            messages(body({ walls, openings }, { cols: 200, rows: 200 }))
        ).toContain(`${P}tooManyDoors`);
    });

    it('rejects negative expectedSceneVersion', () => {
        expect(
            mapArtSaveSchema.safeParse({ ...body(), expectedSceneVersion: -1 })
                .success
        ).toBe(false);
    });

    it('rejects an unknown stamp asset and duplicate stamp ids', () => {
        expect(messages(body({ stamps: [stamp({ asset: 'nope' })] }))).toContain(
            `${P}unknownStamp`
        );
        expect(
            messages(body({ stamps: [stamp(), stamp({ x: 250 })] }))
        ).toContain(`${P}duplicateStamp`);
    });

    it('rejects a stamp centre outside the map', () => {
        expect(messages(body({ stamps: [stamp({ x: 1001 })] }))).toContain(
            `${P}outOfBounds`
        );
        expect(messages(body({ stamps: [stamp({ x: 1000, y: 0 })] }))).toEqual([]);
    });

    it('rejects too many blocked cells from scene.blocked and stamps together', () => {
        const blocked: Record<string, null> = {};

        for (let i = 0; i < MAP_LIMITS.maxTerrainCells; i++)
            blocked[`${i % 100}:${Math.floor(i / 100)}`] = null;

        const map = { cols: 100, rows: 100 };

        expect(
            messages(
                body({ blocked, stamps: [stamp({ asset: 'crate', x: 3650, y: 3750 })] }, map)
            )
        ).toContain(`${P}tooManyBlocked`);
        expect(
            messages(
                body({ blocked, stamps: [stamp({ asset: 'crate', x: 50, y: 50 })] }, map)
            )
        ).not.toContain(`${P}tooManyBlocked`);
    });
});
