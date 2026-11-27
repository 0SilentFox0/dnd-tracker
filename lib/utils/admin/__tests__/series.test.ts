import { describe, expect, it } from 'vitest';

import { dayRange, delta, fillDays, rollingDistinct } from '../series';

describe('series', () => {
    it('dayRange is inclusive', () => {
        expect(dayRange('2026-03-30', '2026-04-02')).toEqual([
            '2026-03-30',
            '2026-03-31',
            '2026-04-01',
            '2026-04-02',
        ]);
    });

    it('fillDays fills gaps with zero', () => {
        expect(
            fillDays(
                [
                    { day: '2026-03-01', n: 2 },
                    { day: '2026-03-03', n: 5 },
                ],
                '2026-03-01',
                '2026-03-04'
            )
        ).toEqual([2, 0, 5, 0]);
    });

    it('rollingDistinct counts a user in the window only', () => {
        const days = dayRange('2026-03-01', '2026-03-09');

        const wau = rollingDistinct(
            [
                { day: '2026-03-01', userId: 'a' },
                { day: '2026-03-01', userId: 'a' },
            ],
            days,
            7
        );

        expect(wau.slice(0, 7)).toEqual([1, 1, 1, 1, 1, 1, 1]);
        expect(wau[7]).toBe(0);
    });

    it('delta is relative and null for a zero base', () => {
        expect(delta(10, 5)).toBe(1);
        expect(delta(1, 0)).toBeNull();
    });
});
