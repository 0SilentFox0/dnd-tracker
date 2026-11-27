import { describe, expect, it } from 'vitest';

import type { MapDims } from '../scene';
import { stampCells } from '../stamp-cells';

import type { StampDef } from '@/lib/constants/map-art/stamps';
import { cellKey } from '@/lib/utils/battle/grid/geometry';
import { hexCenter, hexNeighbors } from '@/lib/utils/battle/grid/hex';
import type { MapArtStamp } from '@/types/battle-map';

const base = {
    biome: 'dungeon',
    category: 'c',
    nameKey: 'n',
    file: 'f.webp',
    layer: 'object',
    shadow: 'none',
    priority: 1,
} as const;

const DEFS: Record<string, StampDef> = {
    rect21: { ...base, id: 'rect21', cols: 2, rows: 1, blocks: { shape: 'rect', w: 2, h: 1 } },
    rect11: { ...base, id: 'rect11', cols: 1, rows: 1, blocks: { shape: 'rect', w: 1, h: 1 } },
    ell22: { ...base, id: 'ell22', cols: 2, rows: 2, blocks: { shape: 'ellipse', w: 2, h: 2 } },
    ell25: { ...base, id: 'ell25', cols: 3, rows: 3, blocks: { shape: 'ellipse', w: 2.5, h: 2.5 } },
    tiny: { ...base, id: 'tiny', cols: 1, rows: 1, blocks: { shape: 'rect', w: 0.2, h: 0.2 } },
    decal: { ...base, id: 'decal', cols: 2, rows: 2 },
    wall: { ...base, id: 'wall', cols: 1, rows: 1, sight: true, blocks: { shape: 'rect', w: 1, h: 1 } },
};

const lookup = (id: string) => DEFS[id];

const stamp = (asset: string, x: number, y: number, over: Partial<MapArtStamp> = {}): MapArtStamp => ({
    id: 's1',
    asset,
    x,
    y,
    rot: 0,
    scale: 1,
    flip: false,
    z: 0,
    ...over,
});

const sq = { cols: 10, rows: 10, gridType: 'square' as const };

const hex = { cols: 10, rows: 10, gridType: 'hex' as const };

const cells = (stamps: MapArtStamp[], map: MapDims = sq) =>
    [...stampCells(stamps, map, lookup).blocked].sort();

describe('stampCells blocked square', () => {
    it('blocks cells whose centre is strictly inside a rect', () => {
        expect(cells([stamp('rect21', 300, 250)])).toEqual(['2:2', '3:2']);
    });

    it('keeps only the stamp cell when centres lie exactly on the border', () => {
        expect(cells([stamp('rect21', 300, 250, { rot: 90 })])).toEqual(['3:2']);
    });

    it('covers a legacy table-long footprint', () => {
        expect(cells([stamp('rect21', 100, 50)])).toEqual(['0:0', '1:0']);
        expect(cells([stamp('rect11', 350, 450)])).toEqual(['3:4']);
    });

    it('scales the footprint', () => {
        const four = ['2:2', '2:3', '3:2', '3:3'];

        expect(cells([stamp('rect11', 300, 300, { scale: 2 })])).toEqual(four);
        expect(cells([stamp('ell22', 300, 300)])).toEqual(four);
    });

    it('blocks at least the cell under the stamp centre', () => {
        expect(cells([stamp('tiny', 330, 470)])).toEqual(['3:4']);
    });

    it('clips to the map and ignores stamps without blocks', () => {
        expect(cells([stamp('rect21', 50, 50)])).toEqual(['0:0']);
        expect(cells([stamp('decal', 500, 500)])).toEqual([]);
        expect(cells([stamp('rect11', -500, -500)])).toEqual([]);
    });

    it('ignores flip and unknown assets', () => {
        const a = cells([stamp('rect21', 300, 250, { rot: 30 })]);

        expect(cells([stamp('rect21', 300, 250, { rot: 30, flip: true })])).toEqual(a);
        expect(cells([stamp('nope', 300, 250)])).toEqual([]);
    });
});

describe('stampCells blocked hex', () => {
    const c = hexCenter({ x: 3, y: 3 });

    it('blocks one cell for a 1x1 rect on a cell centre', () => {
        expect(cells([stamp('rect11', c.x, c.y)], hex)).toEqual(['3:3']);
    });

    it('blocks the cell and its six neighbours for radius 125', () => {
        const expected = [{ x: 3, y: 3 }, ...hexNeighbors({ x: 3, y: 3 })]
            .map(cellKey)
            .sort();

        expect(cells([stamp('ell25', c.x, c.y)], hex)).toEqual(expected);
    });
});

describe('stampCells sight', () => {
    it('mirrors blocked cells into sight only for sight stamps', () => {
        const a = stampCells([stamp('wall', 350, 450)], sq, lookup);

        expect([...a.sight]).toEqual(['3:4']);
        expect([...a.blocked]).toEqual(['3:4']);

        const b = stampCells([stamp('rect11', 350, 450)], sq, lookup);

        expect([...b.blocked]).toEqual(['3:4']);
        expect(b.sight.size).toBe(0);
    });
});
