import { describe, expect, it } from 'vitest';

import { diffTileChunks } from '../diff';
import { decodeTileChunk } from '../rle';

describe('diffTileChunks', () => {
    it('emits only changed, added, and removed layer chunks', () => {
        const before = {
            '0:0': new Uint16Array(256).fill(1),
            '1:0': new Uint16Array(256).fill(2),
        };

        const changed = new Uint16Array(256).fill(1);

        changed[0] = 3;

        const after = {
            '0:0': changed,
            '2:0': new Uint16Array(256).fill(4),
        };

        const patches = diffTileChunks('ground', before, after);

        expect(patches.map(({ cx, cy, data }) => [cx, cy, data === null])).toEqual([
            [0, 0, false],
            [1, 0, true],
            [2, 0, false],
        ]);
        expect(decodeTileChunk(patches[0].data as string)[0]).toBe(3);
        expect(decodeTileChunk(patches[2].data as string)[0]).toBe(4);
    });

    it('returns no patches when chunk cell values are unchanged', () => {
        expect(
            diffTileChunks(
                'objects',
                { '0:0': new Uint16Array(256).fill(7) },
                { '0:0': new Uint16Array(256).fill(7) }
            )
        ).toEqual([]);
    });
});
