import { describe, expect, it } from 'vitest';

import {
    createWorldLayerSchema,
    createWorldMarkerSchema,
    deleteWorldLayerQuerySchema,
    layerRectSchema,
    setLayerHeroesSchema,
    updateWorldLayerSchema,
    updateWorldMarkerSchema,
} from '@/lib/schemas/world';

describe('layerRectSchema', () => {
    it('accepts the default and an overhanging rect', () => {
        expect(layerRectSchema.safeParse({ x: 0, y: 0, w: 1, h: 1 }).success).toBe(
            true
        );
        expect(
            layerRectSchema.safeParse({ x: -1, y: 2, w: 2, h: 0.02 }).success
        ).toBe(true);
    });

    it.each([
        { x: -1.1, y: 0, w: 1, h: 1 },
        { x: 0, y: 2.1, w: 1, h: 1 },
        { x: 0, y: 0, w: 0.01, h: 1 },
        { x: 0, y: 0, w: 1, h: 2.5 },
    ])('rejects %j', (rect) => {
        expect(layerRectSchema.safeParse(rect).success).toBe(false);
    });
});

describe('createWorldLayerSchema', () => {
    it('requires a name', () => {
        expect(
            createWorldLayerSchema.safeParse({ mapId: 'm1', name: ' ' }).success
        ).toBe(false);
        expect(
            createWorldLayerSchema.safeParse({
                mapId: 'm1',
                name: 'Fog of war',
                color: '#112233',
            }).success
        ).toBe(true);
    });
});

describe('updateWorldLayerSchema', () => {
    it('rejects an empty patch and unknown keys', () => {
        expect(updateWorldLayerSchema.safeParse({}).success).toBe(false);
        expect(updateWorldLayerSchema.safeParse({ mapId: 'x' }).success).toBe(
            false
        );
    });

    it('rejects an unknown visibility', () => {
        expect(updateWorldLayerSchema.safeParse({ visibility: 'x' }).success).toBe(
            false
        );
        expect(
            updateWorldLayerSchema.safeParse({ visibility: 'heroes' }).success
        ).toBe(true);
    });

    it('bounds opacity and the rect', () => {
        expect(updateWorldLayerSchema.safeParse({ opacity: 0.01 }).success).toBe(
            false
        );
        expect(updateWorldLayerSchema.safeParse({ opacity: 1 }).success).toBe(true);
        expect(
            updateWorldLayerSchema.safeParse({
                rect: { x: 3, y: 0, w: 1, h: 1 },
            }).success
        ).toBe(false);
    });

    it('allows clearing the image', () => {
        expect(updateWorldLayerSchema.safeParse({ imageUrl: null }).success).toBe(
            true
        );
    });
});

describe('setLayerHeroesSchema', () => {
    it('caps the list', () => {
        expect(setLayerHeroesSchema.safeParse({ heroIds: ['a'] }).success).toBe(
            true
        );
        expect(
            setLayerHeroesSchema.safeParse({
                heroIds: Array.from({ length: 101 }, (_, i) => `h${i}`),
            }).success
        ).toBe(false);
    });
});

describe('deleteWorldLayerQuerySchema', () => {
    it('accepts ungroup, delete and nothing', () => {
        expect(deleteWorldLayerQuerySchema.safeParse({}).success).toBe(true);
        expect(
            deleteWorldLayerQuerySchema.safeParse({ markers: 'ungroup' }).success
        ).toBe(true);
        expect(
            deleteWorldLayerQuerySchema.safeParse({ markers: 'x' }).success
        ).toBe(false);
    });
});

describe('marker layerId', () => {
    it('allows null on create and update', () => {
        expect(
            createWorldMarkerSchema.safeParse({
                mapId: 'm1',
                kind: 'point',
                x: 0.1,
                y: 0.1,
                name: 'A',
                layerId: null,
            }).success
        ).toBe(true);
        expect(updateWorldMarkerSchema.safeParse({ layerId: null }).success).toBe(
            true
        );
        expect(updateWorldMarkerSchema.safeParse({ layerId: '' }).success).toBe(
            false
        );
    });
});
