import { describe, expect, it } from 'vitest';

import {
    applyMapStateDelta,
    baseDoorsOf,
    composeEffectiveMap,
    diffMapState,
    pruneRemoved,
} from '../effective-map';

import { testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { edgeBlocks, wallsOf } from '@/lib/utils/battle/grid/edges';
import type { BattleMapState } from '@/types/battle-grid';

const at = (x: number, y: number) => ({ x, y });

const state = (removedEdges: string[], doors = {}): BattleMapState => ({
    removedEdges,
    doors,
});

describe('composeEffectiveMap doors', () => {
    const base = testMap(6, 6, {
        walls: ['0:0:e'],
        doors: { '2:2:e': { open: false }, '3:3:e': { open: false } },
    });

    it('state.doors перекриває базу, ідентичність стабільна', () => {
        const s = state([], { '2:2:e': { open: true } });

        const eff = composeEffectiveMap(base, s);

        expect(eff.doors).toEqual({
            '2:2:e': { open: true },
            '3:3:e': { open: false },
        });
        expect(composeEffectiveMap(base, s).doors).toBe(eff.doors);
        expect(baseDoorsOf(eff.doors)).toBe(base.doors);
        expect(edgeBlocks(eff, at(2, 2), at(3, 2), 'move')).toBe(false);
    });

    it('виламані двері зникають, стан для неіснуючих дверей ігнорується', () => {
        const eff = composeEffectiveMap(
            base,
            state(['3:3:e'], { '5:5:e': { open: true } })
        );

        expect(Object.keys(eff.doors ?? {})).toEqual(['2:2:e']);
        expect(baseDoorsOf(eff.doors)).toBe(base.doors);
    });

    it('без стану двері бази — та сама посилання', () => {
        expect(composeEffectiveMap(base, state([])).doors).toBe(base.doors);
    });
});

describe('composeEffectiveMap', () => {
    const base = testMap(6, 6, { walls: ['2:2:e', '3:3:e'], bars: ['1:1:s'] });

    it('null/empty state without lib edges is base itself', () => {
        expect(composeEffectiveMap(base, null)).toBe(base);
        expect(composeEffectiveMap(base, state([]))).toBe(base);
    });

    it('subtracts removed edges from walls and bars', () => {
        const eff = composeEffectiveMap(base, state(['2:2:e', '1:1:s']));

        expect(eff.walls).toEqual(['3:3:e']);
        expect(eff.bars).toEqual([]);
    });

    it('is stable for identical inputs', () => {
        const s = state(['2:2:e']);

        const lib = { walls: ['0:0:e'], bars: [] };

        expect(composeEffectiveMap(base, s)).toBe(composeEffectiveMap(base, s));
        expect(composeEffectiveMap(base, s, lib)).toBe(
            composeEffectiveMap(base, s, lib)
        );
        expect(composeEffectiveMap(base, s, lib)).not.toBe(
            composeEffectiveMap(base, s)
        );
        expect(wallsOf(composeEffectiveMap(base, s))).toBe(
            wallsOf(composeEffectiveMap(base, s))
        );
    });

    it('adds library edges and removes state edges from them', () => {
        const lib = { walls: ['0:0:e', '4:4:e'], bars: ['5:5:s'] };

        const eff = composeEffectiveMap(base, state(['4:4:e']), lib);

        expect(eff.walls?.sort()).toEqual(['0:0:e', '2:2:e', '3:3:e']);
        expect(eff.bars?.sort()).toEqual(['1:1:s', '5:5:s']);
    });

    it('linked base without walls works with library only', () => {
        const bare = testMap(6, 6);

        const eff = composeEffectiveMap(bare, null, {
            walls: ['1:1:e'],
            bars: [],
        });

        expect(eff.walls).toEqual(['1:1:e']);
    });

    it('does not subtract mode walls', () => {
        const maze = testMap(6, 6, {
            maze: {
                walls: ['4:0:e'],
                exit: null,
                difficulty: 'easy',
                teleports: [],
                fog: [],
                marks: {},
                dark: false,
            },
        } as never);

        const eff = composeEffectiveMap(maze, state(['4:0:e']));

        expect(eff.maze).toBe(maze.maze);
    });

    it('edgeBlocks passes through removed edge but not the neighbour', () => {
        const eff = composeEffectiveMap(base, state(['2:2:e']));

        expect(edgeBlocks(base, at(2, 2), at(3, 2), 'move')).toBe(true);
        expect(edgeBlocks(eff, at(2, 2), at(3, 2), 'move')).toBe(false);
        expect(edgeBlocks(eff, at(3, 3), at(4, 3), 'move')).toBe(true);
    });
});

describe('diffMapState / applyMapStateDelta', () => {
    it('null for equal states', () => {
        expect(diffMapState(null, state([]))).toBeNull();
        expect(diffMapState(state(['a']), state(['a']))).toBeNull();
    });

    it('diffs removed edges and doors; apply is the inverse', () => {
        const before = state(['1:1:e'], { '0:0': { open: false } });

        const after = state(['2:2:e'], { '3:3': { open: true, locked: true } });

        const delta = diffMapState(before, after);

        if (!delta) throw new Error('no delta');

        expect(delta.removed).toEqual({ add: ['2:2:e'], remove: ['1:1:e'] });
        expect(delta.doors).toEqual({
            '0:0': null,
            '3:3': { open: true, locked: true },
        });

        const applied = applyMapStateDelta(before, delta);

        expect(applied.removedEdges).toEqual(['2:2:e']);
        expect(applied.doors).toEqual(after.doors);
        expect(diffMapState(applied, after)).toBeNull();
    });

    it('apply on null state creates one', () => {
        const s = applyMapStateDelta(null, {
            removed: { add: ['1:1:e'], remove: [] },
        });

        expect(s).toEqual({ removedEdges: ['1:1:e'], doors: {} });
    });

    it('detects door change', () => {
        const d = diffMapState(
            state([], { '1:1': { open: false } }),
            state([], { '1:1': { open: true } })
        );

        expect(d?.doors).toEqual({ '1:1': { open: true } });
    });

    it('diffs fog mode, radius, and revealed runs without replacing other state', () => {
        const before: BattleMapState = {
            ...state(['1:1:e'], { '2:2:e': { open: true } }),
            fog: {
                mode: 'reveal',
                revealed: [
                    [0, 0, 5],
                    [1, 1, 4],
                ],
                visionRadius: 8,
            },
        };

        const after: BattleMapState = {
            ...state(['1:1:e'], { '2:2:e': { open: true } }),
            fog: {
                mode: 'vision',
                revealed: [
                    [0, 0, 3],
                    [2, 4, 7],
                ],
                visionRadius: 11,
            },
        };

        const delta = diffMapState(before, after);

        expect(delta?.fog).toEqual({
            mode: 'vision',
            visionRadius: 11,
            revealed: {
                add: [[2, 4, 7]],
                remove: [
                    [0, 3, 5],
                    [1, 1, 4],
                ],
            },
        });

        if (!delta) throw new Error('expected fog delta');

        const applied = applyMapStateDelta(before, delta);

        expect(applied).toEqual(after);
        expect(diffMapState(applied, after)).toBeNull();
    });
});

describe('pruneRemoved', () => {
    it('returns the same reference when nothing is dropped', () => {
        const s = state(['1:1:e']);

        expect(pruneRemoved(s, () => true)).toBe(s);
        expect(pruneRemoved(null, () => false)).toBeNull();
        expect(pruneRemoved(undefined, () => false)).toBeUndefined();
    });

    it('drops removals failing the predicate and keeps the rest of the state', () => {
        const s = state(['1:1:e', '2:2:e'], { '3:3': { open: true } });

        expect(pruneRemoved(s, (e) => e !== '1:1:e')).toEqual({
            removedEdges: ['2:2:e'],
            doors: { '3:3': { open: true } },
        });
    });
});

describe('empty-input fast paths', () => {
    it('applyMapStateDelta keeps the reference for an empty delta', () => {
        const s = state(['1:1:e']);

        expect(applyMapStateDelta(s, {})).toBe(s);
        expect(
            applyMapStateDelta(s, { removed: { add: [], remove: [] } })
        ).toBe(s);
    });

    it('library arrays are reused as-is when nothing is removed or owned', () => {
        const lib = { walls: ['1:1:e'], bars: ['2:2:s'] };

        const eff = composeEffectiveMap(testMap(6, 6), state([]), lib);

        expect(eff.walls).toBe(lib.walls);
        expect(eff.bars).toBe(lib.bars);
    });
});
