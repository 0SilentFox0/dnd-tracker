import { describe, expect, it } from 'vitest';

import { mapArtSaveSchema, mapArtSceneSchema } from '../map-art';

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

    it('rejects non-empty stamps', () => {
        expect(mapArtSceneSchema.safeParse(scene({ stamps: [{}] })).success).toBe(
            false
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
});
