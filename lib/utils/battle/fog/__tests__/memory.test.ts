import { describe, expect, it } from 'vitest';

import { decodeFogMemory, encodeFogMemory } from '../memory';

describe('fog memory codec', () => {
    it('bounds persisted intervals and tolerates corrupt or old data', () => {
        const encoded = encodeFogMemory([[0, 0, 3], [2, 3, 10]], { cols: 5, rows: 3 });

        expect(decodeFogMemory(encoded, { cols: 5, rows: 3 })).toEqual([
            [0, 0, 3],
            [2, 3, 5],
        ]);
        expect(decodeFogMemory('{bad', { cols: 5, rows: 3 })).toEqual([]);
        expect(decodeFogMemory('{"version":0,"runs":[]}', { cols: 5, rows: 3 })).toEqual([]);
    });
});
