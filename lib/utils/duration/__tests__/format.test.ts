import { describe, expect, it } from 'vitest';

import { durationArgs } from '../format';

import { durationOf, durationSeg } from '@/lib/utils/abilities/segments';

describe('durationArgs', () => {
    it.each([
        [1, 'rounds', 1],
        [9, 'rounds', 9],
        [10, 'minutes', 1],
        [100, 'minutes', 10],
        [590, 'minutes', 59],
        [600, 'hours', 1],
        [4800, 'hours', 8],
        [14400, 'hours', 24],
    ])('%i rounds -> %s %i', (rounds, unit, n) => {
        expect(durationArgs(rounds)).toMatchObject({ unit, n });
    });

    it('keeps the round count and adds the converted value otherwise', () => {
        expect(durationArgs(45)).toEqual({
            unit: 'roundsMinutes',
            n: 45,
            approx: 4.5,
        });

        expect(durationArgs(650)).toMatchObject({
            unit: 'roundsHours',
            n: 650,
            approx: 1.1,
        });
    });
});

describe('duration segments', () => {
    it('wraps the args in the shared duration message', () => {
        expect(durationSeg(100)).toMatchObject({
            key: 'duration',
            params: { unit: 'minutes', n: 10 },
        });

        expect(durationOf(undefined)).toBe('?');
    });
});
