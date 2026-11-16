import { describe, expect, it } from 'vitest';

import {
    areIllusionFoes,
    disguiseFor,
    expandIllusionGroups,
    illusionGroups,
    illusionPairs,
} from '../illusion';

import { emptyMaze } from '@/lib/utils/battle/modes/maze/constants';
import type { IllusionPair } from '@/types/battle';

const pair: IllusionPair = {
    a: 'zehir',
    b: 'godric',
    aSees: { name: 'Wolf', unitId: 'u1' },
    bSees: { name: 'Rogue', avatar: '/r.png' },
};

const other: IllusionPair = {
    a: 'x',
    b: 'y',
    aSees: { name: 'A' },
    bSees: { name: 'B' },
};

describe('illusion helpers', () => {
    it('illusionPairs reads the maze config and tolerates absence', () => {
        expect(illusionPairs(undefined)).toEqual([]);
        expect(illusionPairs(null)).toEqual([]);
        expect(illusionPairs(emptyMaze())).toEqual([]);
        expect(
            illusionPairs({ ...emptyMaze(), illusionSwap: { pairs: [pair] } })
        ).toEqual([pair]);
    });

    it('areIllusionFoes is symmetric and pair-local', () => {
        expect(areIllusionFoes([pair, other], 'zehir', 'godric')).toBe(true);
        expect(areIllusionFoes([pair, other], 'godric', 'zehir')).toBe(true);
        expect(areIllusionFoes([pair, other], 'zehir', 'x')).toBe(false);
        expect(areIllusionFoes([pair], 'zehir', 'zehir')).toBe(false);
    });

    it('disguiseFor gives each viewer the mask of its partner', () => {
        expect(disguiseFor([pair], 'zehir', 'godric')).toBe(pair.aSees);
        expect(disguiseFor([pair], 'godric', 'zehir')).toBe(pair.bSees);
        expect(disguiseFor([pair], 'c', 'godric')).toBeUndefined();
        expect(disguiseFor([pair], 'zehir', 'c')).toBeUndefined();
    });

    it('expands overlapping multi-hero groups into pairwise hostile relations', () => {
        const wolf = { name: 'Wolf' };
        const orc = { name: 'Orc' };
        const elf = { name: 'Elf' };
        const groups = [
            {
                heroes: [
                    { id: 'A', disguise: wolf },
                    { id: 'B', disguise: orc },
                    { id: 'C', disguise: elf },
                ],
            },
            {
                heroes: [
                    { id: 'A', disguise: wolf },
                    { id: 'D', disguise: orc },
                ],
            },
            {
                heroes: [
                    { id: 'C', disguise: elf },
                    { id: 'D', disguise: wolf },
                ],
            },
        ];
        const pairs = expandIllusionGroups(groups);

        expect(pairs).toHaveLength(5);
        expect(areIllusionFoes(pairs, 'A', 'B')).toBe(true);
        expect(areIllusionFoes(pairs, 'A', 'C')).toBe(true);
        expect(areIllusionFoes(pairs, 'A', 'D')).toBe(true);
        expect(areIllusionFoes(pairs, 'C', 'D')).toBe(true);
        expect(areIllusionFoes(pairs, 'B', 'D')).toBe(false);
        expect(disguiseFor(pairs, 'A', 'B')).toBe(orc);
        expect(disguiseFor(pairs, 'B', 'A')).toBe(wolf);
    });

    it('converts saved legacy pairs into editable two-hero groups', () => {
        expect(
            illusionGroups({ ...emptyMaze(), illusionSwap: { pairs: [pair] } })
        ).toEqual([
            {
                heroes: [
                    { id: 'zehir', disguise: pair.bSees },
                    { id: 'godric', disguise: pair.aSees },
                ],
            },
        ]);
    });
});
