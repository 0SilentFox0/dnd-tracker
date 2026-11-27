import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/constants/map-art/stamps', () => {
    const defs: Record<string, unknown> = {
        wall: {
            id: 'wall',
            cols: 1,
            rows: 1,
            sight: true,
            blocks: { shape: 'rect', w: 1, h: 1 },
        },
    };

    return { stampDef: (id: string) => defs[id], isStampId: (id: string) => id in defs };
});

import { composeArtSave } from '../compose';
import { emptyScene } from '../scene';

import type { BattleMapSaveInput } from '@/lib/schemas/battle-maps';

const save = {
    name: 'm',
    expectedVersion: 1,
    walls: ['9:9:e'],
    bars: [],
    map: {
        cols: 10,
        rows: 8,
        opacity: 1,
        background: 'old.png',
        gridOffset: { x: 0.2, y: 0.1 },
        blocked: ['1:1'],
        doors: {},
    },
} as unknown as BattleMapSaveInput;

const scene = {
    ...emptyScene(),
    walls: { '2:2:e': 'stone', '3:3:s': 'stone' },
    openings: { '3:3:s': { kind: 'door' as const, material: 'wood' } },
};

describe('composeArtSave', () => {
    it('applies the baked background and scene mechanics', () => {
        const out = composeArtSave({ save, scene, bakedUrl: 'baked.webp' });

        expect(out.map.background).toBe('baked.webp');
        expect(out.map.backgroundCols).toBe(10);
        expect(out.map.backgroundRows).toBe(8);
        expect(out.map.artBaked).toBe(true);
        expect(out.map).not.toHaveProperty('gridOffset');
        expect(out.walls).toEqual(['2:2:e']);
        expect(out.map.doors).toEqual({ '3:3:s': { open: false } });
        expect(out.map).not.toHaveProperty('blocked');
    });

    it('keeps the background without a baked url', () => {
        const out = composeArtSave({ save, scene });

        expect(out.map.background).toBe('old.png');
        expect(out.map.gridOffset).toEqual({ x: 0.2, y: 0.1 });
        expect(out.map.artBaked).toBeUndefined();
    });

    it('writes sightBlocked from stamps and drops a stale one otherwise', () => {
        const withSight = {
            ...scene,
            stamps: [
                { id: 'a', asset: 'wall', x: 450, y: 350, rot: 0, scale: 1, flip: false, z: 0 },
            ],
        };

        const staleSave = {
            ...save,
            map: { ...save.map, sightBlocked: ['9:9'] },
        } as unknown as BattleMapSaveInput;

        const out = composeArtSave({ save: staleSave, scene: withSight });

        expect(out.map.sightBlocked).toEqual(['4:3']);
        expect(out.map.blocked).toEqual(['4:3']);
        expect(composeArtSave({ save: staleSave, scene }).map).not.toHaveProperty(
            'sightBlocked'
        );
    });
});
