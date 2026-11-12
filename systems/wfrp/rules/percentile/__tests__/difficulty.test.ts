import { describe, expect, it } from 'vitest';

import { DIFFICULTY_KEYS, DIFFICULTY_SL } from '../difficulty';

describe('difficulty table', () => {
    it('lists seven keys in order', () => {
        expect(DIFFICULTY_KEYS).toEqual([
            'veryEasy',
            'easy',
            'average',
            'challenging',
            'difficult',
            'hard',
            'veryHard',
        ]);
    });

    it('has an SL modifier for every key', () => {
        expect(DIFFICULTY_SL).toEqual({
            veryEasy: 6,
            easy: 4,
            average: 2,
            challenging: 0,
            difficult: -1,
            hard: -2,
            veryHard: -3,
        });
    });
});
