import { describe, expect, it } from 'vitest';

import { isAdjacentOnMap } from '../adjacency';
import { cellKey } from '../geometry';
import { hexDisk, hexDistance, hexLine, hexNeighbors } from '../hex';
import { lineOfFire } from '../line-of-fire';
import { rangeWindow } from '../map-scene';
import { nearestTo } from '../nearest';
import { reachable } from '../path';
import { awayStep, pushAway } from '../push';
import {
    aimInRange,
    areaCentre,
    participantsInCells,
    templateCells,
} from '../template';

import { ParticipantSide } from '@/lib/constants/battle';
import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { visibleFrom } from '@/lib/utils/battle/vision/shadowcast';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { GridPoint } from '@/types/battle-grid';

const hexMap = testMap(12, 12, { gridType: 'hex' });

const squareMap = testMap(12, 12);

const keys = (cells: GridPoint[]) => cells.map(cellKey).sort();

describe('hex path and reach', () => {
    const hero = placed('h', { side: ParticipantSide.ALLY, at: { x: 5, y: 5 } });

    it('gives six neighbours at cost 1', () => {
        const cost = reachable(hexMap, [hero], hero, 1);

        expect([...cost.keys()].sort()).toEqual(keys(hexNeighbors({ x: 5, y: 5 })));
        expect([...cost.values()].every((c) => c === 1)).toBe(true);
    });

    it('covers a hex disk within the budget', () => {
        const cost = reachable(hexMap, [hero], hero, 2);

        expect(cost.size).toBe(18);
        expect([...cost.keys()].every((k) => {
            const [x, y] = k.split(':').map(Number);

            return hexDistance({ x, y }, { x: 5, y: 5 }) <= 2;
        })).toBe(true);
    });

    it('treats a size-4 token as one cell', () => {
        const big = placed('b', {
            side: ParticipantSide.ALLY,
            at: { x: 5, y: 5 },
            size: 4,
        });

        expect(reachable(hexMap, [big], big, 1).size).toBe(6);
        expect(reachable(squareMap, [big], big, 1).size).toBeLessThan(8);
    });

    it('is blocked by an enemy cell', () => {
        const [n] = hexNeighbors({ x: 5, y: 5 });

        const foe = placed('f', { at: n });

        expect(reachable(hexMap, [hero, foe], hero, 1).has(cellKey(n))).toBe(false);
    });
});

describe('hex adjacency and nearest', () => {
    it('is adjacent only on the six hex neighbours', () => {
        const a = placed('a', { at: { x: 2, y: 2 } });

        const diag = placed('d', { at: { x: 3, y: 3 } });

        const [n] = hexNeighbors({ x: 2, y: 2 });

        expect(hexDistance({ x: 2, y: 2 }, { x: 3, y: 3 })).toBe(2);
        expect(isAdjacentOnMap(hexMap, a, diag)).toBe(false);
        expect(isAdjacentOnMap(squareMap, a, diag)).toBe(true);
        expect(isAdjacentOnMap(hexMap, a, placed('n', { at: n }))).toBe(true);
    });

    it('picks the nearest by hex distance', () => {
        const from = placed('f', { at: { x: 0, y: 0 } });

        const diag = placed('d', { at: { x: 1, y: 1 } });

        const straight = placed('s', { at: { x: 0, y: 2 } });

        expect(nearestTo(from, [diag, straight], 'hex')).toBe(diag);
        expect(nearestTo(from, [diag, straight], 'square')).toBe(diag);
        expect(hexDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(
            hexDistance({ x: 0, y: 0 }, { x: 0, y: 2 })
        );
    });
});

describe('hex templates', () => {
    const aim = { x: 6, y: 6 };

    const cells = (shape: 'circle' | 'cross' | 'cube', size: number) =>
        templateCells(hexMap, { shape, size }, [], aim, DEFAULT_RULES);

    it('circle is a hex disk', () => {
        expect(cells('circle', 20).sort()).toEqual(keys(hexDisk(aim, 2)));
    });

    it('cube is a hex disk of half the side', () => {
        expect(cells('cube', 15).sort()).toEqual(keys(hexDisk(aim, 1)));
    });

    it('cross is six rays', () => {
        const out = cells('cross', 10);

        expect(out).toHaveLength(13);
        expect(out).toContain(cellKey(aim));
        expect(
            out.every((k) => {
                const [x, y] = k.split(':').map(Number);

                return hexDistance({ x, y }, aim) <= 2;
            })
        ).toBe(true);
    });

    it('line follows the hex line from the caster', () => {
        const origin = [{ x: 2, y: 6 }];

        const out = templateCells(
            hexMap,
            { shape: 'line', size: 30 },
            origin,
            { x: 8, y: 6 },
            DEFAULT_RULES
        );

        expect(out).toHaveLength(6);
        expect(out[0]).not.toBe(cellKey(origin[0]));

        const chain = [origin[0], ...out.map((k) => {
            const [x, y] = k.split(':').map(Number);

            return { x, y };
        })];

        expect(chain.slice(1).every((c, i) => hexDistance(chain[i], c) === 1)).toBe(true);
        expect(keys(chain.slice(1))).toEqual(
            keys(hexLine(origin[0], { x: 8, y: 6 }).slice(1, 7))
        );
    });

    it('cone is a narrow 60 degree wedge', () => {
        const apex = { x: 6, y: 6 };

        const out = templateCells(
            hexMap,
            { shape: 'cone', size: 15 },
            [apex],
            { x: 6, y: 2 },
            DEFAULT_RULES
        );

        const cellsOut = out.map((k) => {
            const [x, y] = k.split(':').map(Number);

            return { x, y };
        });

        expect(cellsOut.length).toBeGreaterThan(3);
        expect(cellsOut.length).toBeLessThan(15);
        expect(
            cellsOut.every((c) => {
                const d = hexDistance(c, apex);

                return d >= 1 && d <= 3;
            })
        ).toBe(true);
        expect(out).toContain(cellKey({ x: 6, y: 5 }));
        expect(out).not.toContain(cellKey({ x: 6, y: 8 }));
    });

    it('area centre of a disk is its centre', () => {
        expect(areaCentre(keys(hexDisk(aim, 2)), 'hex')).toEqual(aim);
    });

    it('aim range uses hex distance', () => {
        const origin = [{ x: 0, y: 0 }];

        const target = { x: 1, y: 1 };

        expect(aimInRange(origin, target, 5, DEFAULT_RULES, 'square')).toBe(true);
        expect(aimInRange(origin, target, 5, DEFAULT_RULES, 'hex')).toBe(false);
        expect(aimInRange(origin, target, 10, DEFAULT_RULES, 'hex')).toBe(true);
    });

    it('orders targets by hex distance', () => {
        const near = placed('n', { at: { x: 6, y: 5 } });

        const far = placed('f', { at: { x: 6, y: 7 } });

        const set = keys(hexDisk(aim, 2));

        expect(
            participantsInCells([far, near], set, aim, 'hex').map((p) => p.basicInfo.id)
        ).toEqual(['n', 'f']);
    });
});

describe('hex push', () => {
    it('steps one hex directly away', () => {
        const from = { x: 5, y: 5 };

        for (const at of hexNeighbors(from)) {
            const next = awayStep(from, at, 'hex');

            expect(hexDistance(at, next)).toBe(1);
            expect(hexDistance(from, next)).toBe(2);
        }
    });

    it('pushes along a straight hex line', () => {
        const from = { x: 5, y: 5 };

        const [at] = hexNeighbors(from);

        const target = placed('t', { at });

        const out = pushAway(hexMap, [target], from, target, 3);

        expect(out.steps).toBe(3);
        expect(hexDistance(from, out.position)).toBe(4);
    });
});

describe('hex line of fire', () => {
    const shooter = placed('s', { side: ParticipantSide.ALLY, at: { x: 1, y: 6 } });

    const target = placed('t', { at: { x: 7, y: 6 } });

    it('is clear on an empty line', () => {
        expect(lineOfFire(hexMap, [shooter, target], shooter, target).blocked).toBe(false);
    });

    it('is blocked by a creature on the hex line', () => {
        const line = hexLine({ x: 1, y: 6 }, { x: 7, y: 6 });

        const blocker = placed('b', { at: line[3] });

        const result = lineOfFire(hexMap, [shooter, target, blocker], shooter, target);

        expect(result.blocked).toBe(true);
        expect(result.cells).toEqual([cellKey(line[3])]);
    });
});

describe('hex vision', () => {
    it('clips visibility to the hex radius', () => {
        const source = { x: 6, y: 6 };

        const seen = visibleFrom(hexMap, source, 3);

        expect([...seen].sort()).toEqual(keys(hexDisk(source, 3)));
        expect(visibleFrom(squareMap, source, 3).size).toBe(29);
    });
});

describe('rangeWindow', () => {
    it('hex window covers the whole hex area', () => {
        const origin = [{ x: 5, y: 5 }];

        const w = rangeWindow(hexMap, origin, 10, DEFAULT_RULES);

        for (const c of hexDisk(origin[0], 2)) {
            expect(c.x >= w.x && c.x < w.x + w.cols).toBe(true);
            expect(c.y >= w.y && c.y < w.y + w.rows).toBe(true);
        }
    });

    it('square window stays a plain rectangle', () => {
        expect(rangeWindow(squareMap, [{ x: 5, y: 5 }], 10, DEFAULT_RULES)).toEqual({
            x: 3,
            y: 3,
            cols: 5,
            rows: 5,
        });
    });
});
