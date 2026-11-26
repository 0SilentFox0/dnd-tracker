import { describe, expect, it } from 'vitest';

import { decodeEdges, EdgeChunkError, encodeEdges } from '../edge-chunks';

const sorted = (list: string[]) => [...list].sort();

describe('edge-chunks', () => {
    it.each([
        [4, 4],
        [17, 17],
    ])('roundtrip %ix%i', (cols, rows) => {
        const walls: string[] = [];

        const bars: string[] = [];

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if ((x + y) % 3 === 0) walls.push(`${x}:${y}:e`);

                if ((x * y) % 4 === 1) bars.push(`${x}:${y}:s`);
            }
        }

        const out = decodeEdges(
            encodeEdges({ walls, bars }, cols, rows),
            cols,
            rows
        );

        expect(sorted(out.walls)).toEqual(sorted(walls));
        expect(sorted(out.bars)).toEqual(sorted(bars));
    });

    it('roundtrip 200x200 dense', () => {
        const walls: string[] = [];

        const bars: string[] = [];

        for (let y = 0; y < 200; y++) {
            for (let x = 0; x < 200; x++) {
                walls.push(`${x}:${y}:e`);
                bars.push(`${x}:${y}:s`);
            }
        }

        const chunks = encodeEdges({ walls, bars }, 200, 200);

        expect(Object.keys(chunks)).toHaveLength(13 * 13);

        const out = decodeEdges(chunks, 200, 200);

        expect(out.walls).toHaveLength(40000);
        expect(out.bars).toHaveLength(40000);
        expect(sorted(out.walls)).toEqual(sorted(walls));
    });

    it('chunk boundary edges land in the right chunks', () => {
        const edges = {
            walls: ['15:15:e', '16:15:s', '15:16:s', '16:16:e'],
            bars: [],
        };

        const chunks = encodeEdges(edges, 32, 32);

        expect(Object.keys(chunks).sort()).toEqual([
            '0:0',
            '0:1',
            '1:0',
            '1:1',
        ]);
        expect(sorted(decodeEdges(chunks, 32, 32).walls)).toEqual(
            sorted(edges.walls)
        );
    });

    it('deterministic order, no empty chunks', () => {
        const a = encodeEdges({ walls: ['20:1:e', '1:1:s'], bars: [] }, 32, 32);

        const b = encodeEdges({ walls: ['1:1:s', '20:1:e'], bars: [] }, 32, 32);

        expect(Object.keys(a)).toEqual(Object.keys(b));
        expect(a).toEqual(b);
        expect(encodeEdges({}, 32, 32)).toEqual({});
        expect(decodeEdges({}, 4, 4)).toEqual({ walls: [], bars: [] });
    });

    it('edge in both walls and bars encodes as wall; out-of-grid edges dropped', () => {
        const out = decodeEdges(
            encodeEdges({ walls: ['1:1:e'], bars: ['1:1:e', '9:9:e'] }, 4, 4),
            4,
            4
        );

        expect(out).toEqual({ walls: ['1:1:e'], bars: [] });
    });

    it('throws typed errors on bad input', () => {
        const good = encodeEdges({ walls: ['0:0:e'] }, 4, 4)['0:0'];

        expect(() => decodeEdges({ '0:0': '!!!' }, 4, 4)).toThrow(
            EdgeChunkError
        );
        expect(() => decodeEdges({ '0:0': btoa('abc') }, 4, 4)).toThrow(
            EdgeChunkError
        );
        expect(() => decodeEdges({ bad: good }, 4, 4)).toThrow(EdgeChunkError);
        expect(() => decodeEdges({ '1:0': good }, 4, 4)).toThrow(
            EdgeChunkError
        );

        const reserved = new Uint8Array(128);

        reserved[0] = 3;

        expect(() =>
            decodeEdges({ '0:0': btoa(String.fromCharCode(...reserved)) }, 4, 4)
        ).toThrow(EdgeChunkError);
    });

    it('legacy square chunk reads and writes byte-identically', () => {
        const legacy = new Uint8Array(128);

        legacy[0] = 1;
        legacy[1] = 0b1000;

        const b64 = btoa(String.fromCharCode(...legacy));

        const out = decodeEdges({ '0:0': b64 }, 4, 4);

        expect(out).toEqual({ walls: ['0:0:e'], bars: ['2:0:s'] });
        expect(encodeEdges(out, 4, 4)['0:0']).toBe(b64);
        expect(atob(b64)).toHaveLength(128);
    });

    it('hex roundtrip, 193 bytes with version header', () => {
        const walls = ['0:0:n', '5:3:ne', '15:15:se', '16:0:se'];

        const bars = ['2:2:n'];

        const chunks = encodeEdges({ walls, bars }, 20, 20, 'hex');

        const raw = atob(chunks['0:0']);

        expect(raw).toHaveLength(193);
        expect(raw.charCodeAt(0)).toBe(2);

        const out = decodeEdges(chunks, 20, 20, 'hex');

        expect(sorted(out.walls)).toEqual(sorted(walls));
        expect(out.bars).toEqual(bars);
    });

    it('hex: wall wins over bar on the same edge', () => {
        const out = decodeEdges(
            encodeEdges({ walls: ['1:1:ne'], bars: ['1:1:ne'] }, 4, 4, 'hex'),
            4,
            4,
            'hex'
        );

        expect(out).toEqual({ walls: ['1:1:ne'], bars: [] });
    });

    it('format mismatch with grid throws', () => {
        const square = encodeEdges({ walls: ['0:0:e'] }, 4, 4)['0:0'];

        const hex = encodeEdges({ walls: ['0:0:n'] }, 4, 4, 'hex')['0:0'];

        expect(() => decodeEdges({ '0:0': square }, 4, 4, 'hex')).toThrow(
            'chunk 0:0: format does not match grid'
        );
        expect(() => decodeEdges({ '0:0': hex }, 4, 4, 'square')).toThrow(
            EdgeChunkError
        );
        expect(() => encodeEdges({ walls: ['0:0:n'] }, 4, 4)).toThrow(
            'invalid edge key'
        );
        expect(() => encodeEdges({ walls: ['0:0:e'] }, 4, 4, 'hex')).toThrow(
            'invalid edge key'
        );
    });
});
