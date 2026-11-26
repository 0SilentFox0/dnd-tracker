import { describe, expect, it } from 'vitest';

import { cellKey, isPlayable } from '../geometry';
import { hexCenter, hexDistance, hexNeighbors } from '../hex';
import { pathFrom, pathTo, searchPaths } from '../path';

import { ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

function at(
    id: string,
    position: GridPoint,
    side: string = ParticipantSide.ALLY
): BattleParticipant {
    const p = createMockParticipant();

    return {
        ...p,
        basicInfo: {
            ...p.basicInfo,
            id,
            side: side as BattleParticipant['basicInfo']['side'],
        },
        combatStats: { ...p.combatStats, speed: 300 },
        battleData: { ...p.battleData, position },
    };
}

function rng(seed: number) {
    let s = seed;

    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;

        return s / 4294967296;
    };
}

function oracle(
    map: BattleMapConfig,
    start: GridPoint,
    enemies: Set<string>,
    budget: number
): Map<string, number> {
    const difficult = new Set(
        Object.entries(map.terrain ?? {})
            .filter(([, t]) => t.kind === 'difficult')
            .map(([k]) => k)
    );

    const dist = new Map([[cellKey(start), 0]]);

    for (let changed = true; changed; ) {
        changed = false;

        for (const [k, d] of [...dist]) {
            const [x, y] = k.split(':').map(Number);

            for (const n of hexNeighbors({ x, y })) {
                const nk = cellKey(n);

                if (!isPlayable(map, n) || enemies.has(nk)) continue;

                const nd = d + (difficult.has(nk) ? 2 : 1);

                if (nd <= budget && nd < (dist.get(nk) ?? Infinity)) {
                    dist.set(nk, nd);
                    changed = true;
                }
            }
        }
    }

    return dist;
}

const base: BattleMapConfig = {
    cols: 9,
    rows: 8,
    background: null,
    opacity: 0.3,
    gridType: 'hex',
};

describe('hex optimal paths', () => {
    it('open map: path is connected and ends at target', () => {
        const hero = at('h', { x: 0, y: 0 });

        const path = pathTo(base, [hero], hero, { x: 8, y: 7 }, 30) ?? [];

        let prev = { x: 0, y: 0 };

        for (const c of path) {
            expect(
                hexNeighbors(prev).some((n) => cellKey(n) === cellKey(c))
            ).toBe(true);
            prev = c;
        }

        expect(path.at(-1)).toEqual({ x: 8, y: 7 });
    });

    it('matches brute force on random maps (difficult terrain, blocked cells, enemies)', () => {
        for (let seed = 1; seed <= 60; seed++) {
            const r = rng(seed);

            const terrain: NonNullable<BattleMapConfig['terrain']> = {};

            const blocked: string[] = [];

            for (let y = 0; y < base.rows; y++)
                for (let x = 0; x < base.cols; x++) {
                    const v = r();

                    if (v < 0.18) terrain[`${x}:${y}`] = { kind: 'difficult' };
                    else if (v < 0.3) blocked.push(`${x}:${y}`);
                }

            const start = { x: Math.floor(r() * 9), y: Math.floor(r() * 8) };

            delete terrain[cellKey(start)];

            const map = {
                ...base,
                terrain,
                blocked: blocked.filter((k) => k !== cellKey(start)),
            };

            const foes = [0, 1, 2].map((i) =>
                at(
                    `e${i}`,
                    { x: Math.floor(r() * 9), y: Math.floor(r() * 8) },
                    ParticipantSide.ENEMY
                )
            );

            const hero = at('h', start);

            const budget = 3 + Math.floor(r() * 8);

            const enemyCells = new Set(
                foes.flatMap((f) =>
                    f.battleData.position
                        ? [cellKey(f.battleData.position)]
                        : []
                )
            );

            const expected = oracle(map, start, enemyCells, budget);

            const search = searchPaths(map, [hero, ...foes], hero, budget);

            for (const k of search.cost.keys())
                expect(search.cost.get(k), `seed ${seed} ${k}`).toBe(
                    expected.get(k)
                );

            for (const [k, c] of expected) {
                if (k === cellKey(start)) continue;

                expect(search.cost.get(k), `seed ${seed} ${k}`).toBe(c);

                const [x, y] = k.split(':').map(Number);

                const path = pathFrom(search, hero, { x, y }) ?? [];

                let sum = 0;

                let prev: GridPoint = start;

                for (const cell of path) {
                    expect(
                        hexNeighbors(prev).some(
                            (n) => cellKey(n) === cellKey(cell)
                        )
                    ).toBe(true);
                    sum +=
                        map.terrain?.[cellKey(cell)]?.kind === 'difficult'
                            ? 2
                            : 1;
                    prev = cell;
                }

                expect(sum, `seed ${seed} path cost ${k}`).toBe(c);
            }
        }
    });

    it('among equal-cost routes picks the straightest one (matches the best shortest path)', () => {
        const map: BattleMapConfig = { ...base, cols: 15, rows: 15 };

        const from = { x: 7, y: 7 };

        const hero = at('h', from);

        const a = hexCenter(from);

        const deviation = (cells: GridPoint[], to: GridPoint) => {
            const b = hexCenter(to);

            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;

            return Math.max(
                0,
                ...cells.map((c) => {
                    const p = hexCenter(c);

                    return (
                        Math.abs(
                            (b.x - a.x) * (a.y - p.y) -
                                (a.x - p.x) * (b.y - a.y)
                        ) / len
                    );
                })
            );
        };

        const best = (to: GridPoint): number => {
            const total = hexDistance(from, to);

            let min = Infinity;

            const walk = (cur: GridPoint, trail: GridPoint[]) => {
                if (trail.length === total) {
                    if (cellKey(cur) === cellKey(to))
                        min = Math.min(min, deviation(trail, to));

                    return;
                }

                for (const n of hexNeighbors(cur))
                    if (hexDistance(n, to) < hexDistance(cur, to))
                        walk(n, [...trail, n]);
            };

            walk(from, []);

            return min;
        };

        for (const to of [
            { x: 12, y: 9 },
            { x: 3, y: 2 },
            { x: 11, y: 3 },
            { x: 9, y: 13 },
            { x: 7, y: 12 },
            { x: 13, y: 7 },
        ]) {
            const path = pathTo(map, [hero], hero, to, 30) ?? [];

            expect(path).toHaveLength(hexDistance(from, to));
            expect(
                deviation(path, to),
                `to ${cellKey(to)}`
            ).toBeLessThanOrEqual(best(to) + 1e-6);
        }
    });
});
