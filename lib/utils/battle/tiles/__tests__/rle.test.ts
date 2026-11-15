import { describe, expect, it } from 'vitest';

import { decodeTileChunk, encodeTileChunk, TileChunkError } from '../rle';

describe('tile chunk RLE', () => {
    it('encodes a uniform chunk as one little-endian run', () => {
        expect(encodeTileChunk(new Uint16Array(256).fill(0x1234))).toBe(
            'r1:AAE0Eg=='
        );
    });

    it('decodes the versioned little-endian run format to 256 cells', () => {
        const decoded = decodeTileChunk('r1:AAE0Eg==');

        expect(decoded).toHaveLength(256);
        expect([...decoded]).toEqual(new Array(256).fill(0x1234));
    });

    it('preserves the empty tile id and maximum Uint16 id', () => {
        const cells = new Uint16Array(256);

        cells[255] = 0xffff;

        expect([...decodeTileChunk(encodeTileChunk(cells))]).toEqual([
            ...new Array(255).fill(0),
            0xffff,
        ]);
    });

    it.each([
        ['', 'INVALID_VERSION'],
        ['r2:AAE0Eg==', 'INVALID_VERSION'],
        ['r1:AAABAA==', 'INVALID_RUN'],
        ['r1:AQEBAA==', 'CHUNK_OVERFLOW'],
        ['r1:/wABAA==', 'CHUNK_UNDERFLOW'],
        ['r1:AAAA', 'INVALID_DATA'],
        ['r1:%%%=', 'INVALID_DATA'],
    ])('rejects malformed payload %s', (data, code) => {
        expect(() => decodeTileChunk(data)).toThrow(
            expect.objectContaining({ code })
        );
    });

    it('rejects a chunk with more than 256 source values', () => {
        expect(() => encodeTileChunk(new Uint16Array(257))).toThrow(
            expect.objectContaining({ code: 'INVALID_CHUNK_SIZE' })
        );
    });
});

describe('TileChunkError', () => {
    it('is a typed error with a stable code', () => {
        const error = new TileChunkError('INVALID_VERSION', 'bad version');

        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe('INVALID_VERSION');
    });
});
