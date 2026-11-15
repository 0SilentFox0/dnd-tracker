import { describe, expect, it } from 'vitest';

import { applyTileChanges, applyTileStroke, tileAt } from '../edit';

describe('tile editing operations', () => {
    it('paints a brush across chunk boundaries and reverses the atomic group', () => {
        const first = applyTileStroke({
            chunks: {},
            layer: 'ground',
            points: [{ x: 15, y: 0 }, { x: 16, y: 0 }],
            tileId: 2,
            brushSize: 1,
            tool: 'brush',
            mapSize: { cols: 32, rows: 16 },
        });

        expect(Object.keys(first.chunks.ground ?? {})).toEqual(['0:0', '1:0']);
        expect(first.changes).toHaveLength(2);
        expect(
            tileAt(
                applyTileChanges(first.chunks, first.changes, 'before'),
                'ground',
                15,
                0
            )
        ).toBe(0);
        expect(
            tileAt(applyTileChanges(first.chunks, first.changes, 'after'), 'ground', 16, 0)
        ).toBe(2);
    });

    it('supports line, filled rectangle, fill, and erase', () => {
        const line = applyTileStroke({
            chunks: {},
            layer: 'ground',
            points: [{ x: 0, y: 0 }, { x: 3, y: 0 }],
            tileId: 1,
            brushSize: 1,
            tool: 'line',
            mapSize: { cols: 8, rows: 8 },
        });

        expect(line.changes).toHaveLength(4);

        const rect = applyTileStroke({
            chunks: {},
            layer: 'ground',
            points: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
            tileId: 1,
            brushSize: 1,
            tool: 'rectangle',
            mapSize: { cols: 8, rows: 8 },
        });

        expect(rect.changes).toHaveLength(4);

        const filled = applyTileStroke({
            chunks: line.chunks,
            layer: 'ground',
            points: [{ x: 0, y: 0 }],
            tileId: 2,
            brushSize: 1,
            tool: 'fill',
            mapSize: { cols: 8, rows: 8 },
        });

        expect(filled.changes).toHaveLength(4);

        const erased = applyTileStroke({
            chunks: filled.chunks,
            layer: 'ground',
            points: [{ x: 0, y: 0 }],
            tileId: 0,
            brushSize: 1,
            tool: 'eraser',
            mapSize: { cols: 8, rows: 8 },
        });

        expect(erased.changes).toHaveLength(1);
        expect(tileAt(erased.chunks, 'ground', 0, 0)).toBe(0);
    });

    it('keeps layers isolated and clips brush cells to the map bounds', () => {
        const painted = applyTileStroke({
            chunks: { objects: { '0:0': new Uint16Array(256).fill(5) } },
            layer: 'ground',
            points: [{ x: 0, y: 0 }],
            tileId: 1,
            brushSize: 3,
            tool: 'brush',
            mapSize: { cols: 4, rows: 4 },
        });

        expect(painted.changes).toHaveLength(4);
        expect(painted.chunks.objects?.['0:0']?.[0]).toBe(5);
    });
});
