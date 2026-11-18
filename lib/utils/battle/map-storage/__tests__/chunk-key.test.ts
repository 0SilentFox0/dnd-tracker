import { describe, expect, it } from 'vitest';

import { CHUNK_CELLS, chunkKey, parseChunkKey } from '../chunk-key';

import { formatEdgeKey } from '@/lib/utils/battle/grid/walls';
import { toBase64 } from '@/lib/utils/common/base64';

describe('chunk keys', () => {
    it('round-trips and rejects malformed keys', () => {
        expect(parseChunkKey(chunkKey(3, 12))).toEqual({ cx: 3, cy: 12 });
        expect(parseChunkKey('1:2:3')).toBeNull();
        expect(parseChunkKey('-1:2')).toBeNull();
        expect(parseChunkKey('1.5:2')).toBeNull();
        expect(parseChunkKey('NaN:0')).toBeNull();
    });

    it('chunk holds side squared cells', () => {
        expect(CHUNK_CELLS).toBe(256);
    });

    it('edge key and base64 helpers', () => {
        expect(formatEdgeKey({ x: 2, y: 5 }, 's')).toBe('2:5:s');
        expect(toBase64(new Uint8Array([104, 105]))).toBe('aGk=');
    });
});
