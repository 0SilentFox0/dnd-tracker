import { describe, expect, it } from 'vitest';

import { cohortRetention, weekStart } from '../cohorts';

describe('cohortRetention', () => {
    it('weekStart returns the UTC monday', () => {
        expect(weekStart('2026-03-11T10:00:00Z')).toBe('2026-03-09');
        expect(weekStart('2026-03-15T23:59:00Z')).toBe('2026-03-09');
        expect(weekStart('2026-03-16T00:00:00Z')).toBe('2026-03-16');
    });

    it('computes week-1 retention and nulls future weeks', () => {
        const rows = cohortRetention(
            [
                { userId: 'a', createdAt: '2026-03-10T10:00:00Z' },
                { userId: 'b', createdAt: '2026-03-12T10:00:00Z' },
            ],
            [{ userId: 'a', day: '2026-03-18' }],
            [1, 2, 4],
            '2026-03-25'
        );

        expect(rows).toEqual([
            { cohortWeek: '2026-03-09', size: 2, rates: [0.5, 0, null] },
        ]);
    });
});
