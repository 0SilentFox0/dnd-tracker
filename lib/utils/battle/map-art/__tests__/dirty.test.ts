import { describe, expect, it } from 'vitest';

import { dirtyChunks } from '../dirty';
import { encodeFloors } from '../floors';
import { emptyScene } from '../scene';

describe('dirtyChunks', () => {
    it('marks a floor chunk and its neighbours only', () => {
        const prev = emptyScene();

        const cells = new Uint16Array(256);

        cells[0] = 3;

        const next = { ...prev, floors: encodeFloors({ '1:1': cells }) };

        const dirty = dirtyChunks(prev, next, 'square') as Set<string>;

        expect(dirty.has('1:1')).toBe(true);
        expect(dirty.has('0:0')).toBe(true);
        expect(dirty.has('2:2')).toBe(true);
        expect(dirty.has('5:5')).toBe(false);
    });

    it('returns all when lights change or there is no previous scene', () => {
        const prev = emptyScene();

        expect(dirtyChunks(null, prev, 'square')).toBe('all');
        expect(
            dirtyChunks(
                prev,
                {
                    ...prev,
                    lights: [{ id: 'a', x: 1, y: 1, radius: 2, color: '#ffffff', intensity: 1 }],
                },
                'square'
            )
        ).toBe('all');
    });

    it('marks chunks around an added wall', () => {
        const prev = emptyScene();

        const next = { ...prev, walls: { '16:3:e': 'stone' } };

        const dirty = dirtyChunks(prev, next, 'square') as Set<string>;

        expect(dirty.has('1:0')).toBe(true);
        expect(dirty.has('0:0')).toBe(true);
    });
});
