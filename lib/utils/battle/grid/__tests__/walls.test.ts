import { describe, expect, it } from 'vitest';

import {
    allInteriorEdges,
    canStep,
    edgeCells,
    edgeKey,
    hasWall,
    parseEdgeKey,
    wallSet,
} from '../walls';

const grid = { cols: 4, rows: 4 };

describe('edgeKey / parseEdgeKey', () => {
    it('нормалізує напрямок і відхиляє не сусідів', () => {
        expect(edgeKey({ x: 1, y: 1 }, { x: 2, y: 1 })).toBe('1:1:e');
        expect(edgeKey({ x: 2, y: 1 }, { x: 1, y: 1 })).toBe('1:1:e');
        expect(edgeKey({ x: 1, y: 2 }, { x: 1, y: 1 })).toBe('1:1:s');
        expect(edgeKey({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
    });

    it('parseEdgeKey і edgeCells повертають пару клітинок', () => {
        expect(parseEdgeKey('1:2:s').b).toEqual({ x: 1, y: 3 });
        expect(edgeCells('1:2:e')).toEqual([
            { x: 1, y: 2 },
            { x: 2, y: 2 },
        ]);
    });
});

describe('wallSet', () => {
    it('кешує за ідентичністю масиву, порожнє — спільний порожній набір', () => {
        const list = ['0:0:e'];

        expect(wallSet(list)).toBe(wallSet(list));
        expect(wallSet(undefined)).toBe(wallSet([]));
        expect(wallSet(list).has('0:0:e')).toBe(true);
    });
});

describe('hasWall / canStep', () => {
    const walls = wallSet(['1:1:e']);

    it('ортогональний крок блокує стіна; поза сіткою — завжди стіна', () => {
        expect(hasWall(grid, walls, { x: 1, y: 1 }, { x: 2, y: 1 })).toBe(true);
        expect(canStep(grid, walls, { x: 1, y: 1 }, { x: 2, y: 1 })).toBe(
            false
        );
        expect(canStep(grid, walls, { x: 1, y: 1 }, { x: 1, y: 2 })).toBe(true);
        expect(canStep(grid, walls, { x: 0, y: 0 }, { x: -1, y: 0 })).toBe(
            false
        );
    });

    it('діагональ закрита, якщо стіна на будь-якому з чотирьох ребер кута', () => {
        expect(canStep(grid, walls, { x: 1, y: 0 }, { x: 2, y: 1 })).toBe(
            false
        );
        expect(canStep(grid, walls, { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(true);
    });

    it('далекий або нульовий крок неможливий', () => {
        expect(canStep(grid, walls, { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(false);
        expect(canStep(grid, walls, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(false);
    });
});

describe('allInteriorEdges', () => {
    it('2×2 має 4 внутрішні ребра', () => {
        expect(allInteriorEdges({ cols: 2, rows: 2 }).sort()).toEqual([
            '0:0:e',
            '0:0:s',
            '0:1:e',
            '1:0:s',
        ]);
    });
});
