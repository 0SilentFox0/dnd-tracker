import { describe, expect, it } from 'vitest';

import { applyFloorStroke, decodeFloors, encodeFloors } from '../floors';

describe('floors', () => {
    const square = { cols: 20, rows: 20 };

    it('paints a hex brush of 7 cells', () => {
        const r = applyFloorStroke({
            chunks: {},
            points: [{ x: 3, y: 3 }],
            code: 5,
            brushSize: 2,
            tool: 'brush',
            map: { cols: 8, rows: 8, gridType: 'hex' },
        });

        expect(r.changes).toHaveLength(7);
    });

    it('stops a hex fill at a different code', () => {
        const wall = applyFloorStroke({
            chunks: {},
            points: [{ x: 3, y: 3 }],
            code: 5,
            brushSize: 2,
            tool: 'brush',
            map: { cols: 8, rows: 8, gridType: 'hex' },
        });

        const fill = applyFloorStroke({
            chunks: wall.chunks,
            points: [{ x: 3, y: 3 }],
            code: 6,
            brushSize: 1,
            tool: 'fill',
            map: { cols: 8, rows: 8, gridType: 'hex' },
        });

        expect(fill.changes).toHaveLength(7);
    });

    it('round-trips encode and decode and drops erased chunks', () => {
        const stroke = applyFloorStroke({
            chunks: {},
            points: [{ x: 17, y: 1 }],
            code: 4,
            brushSize: 1,
            tool: 'brush',
            map: square,
        });

        const encoded = encodeFloors(stroke.chunks);

        expect(Object.keys(encoded)).toEqual(['1:0']);
        expect(encodeFloors(decodeFloors(encoded))).toEqual(encoded);

        const erased = applyFloorStroke({
            chunks: decodeFloors(encoded),
            points: [{ x: 17, y: 1 }],
            code: 0,
            brushSize: 1,
            tool: 'eraser',
            map: square,
        });

        expect(encodeFloors(erased.chunks)).toEqual({});
    });
});
