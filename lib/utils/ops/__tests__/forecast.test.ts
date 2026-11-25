import { describe, expect, it } from 'vitest';

import { forecastHoursToLimit } from '@/lib/utils/ops/forecast';

const HOUR = 3_600_000;

describe('forecastHoursToLimit', () => {
    it('extrapolates growth', () => {
        const pts = [0, 1, 2, 3].map((h) => ({ t: h * HOUR, v: h * 10 }));

        expect(forecastHoursToLimit(pts, 100)).toBeCloseTo(7, 5);
    });

    it('returns null for plateau and decline', () => {
        const flat = [0, 1, 2].map((h) => ({ t: h * HOUR, v: 5 }));

        const down = [0, 1, 2].map((h) => ({ t: h * HOUR, v: 9 - h }));

        expect(forecastHoursToLimit(flat, 100)).toBeNull();
        expect(forecastHoursToLimit(down, 100)).toBeNull();
    });

    it('returns null with fewer than two points', () => {
        expect(forecastHoursToLimit([], 10)).toBeNull();
        expect(forecastHoursToLimit([{ t: 0, v: 1 }], 10)).toBeNull();
    });

    it('returns 0 when the limit is already reached', () => {
        const pts = [0, 1].map((h) => ({ t: h * HOUR, v: 100 + h }));

        expect(forecastHoursToLimit(pts, 100)).toBe(0);
    });
});
