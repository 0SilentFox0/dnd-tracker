import { describe, expect, it } from 'vitest';

import { hasAnyValue, toChartData } from '../chart-data';
import { formatBytes, formatCount, formatValue, splitAge } from '../format';

describe('format', () => {
    it('formats bytes and counts', () => {
        expect(formatBytes(0)).toBe('0B');
        expect(formatBytes(1536)).toBe('1.5KB');
        expect(formatBytes(500 * 1024 ** 2)).toBe('500MB');
        expect(formatCount(950)).toBe('950');
        expect(formatCount(12_500)).toBe('12.5k');
        expect(formatCount(2_000_000)).toBe('2M');
    });

    it('formats by unit', () => {
        expect(formatValue(0.953, 'ratio')).toBe('95.3%');
        expect(formatValue(1234.4, 'ms')).toBe('1234');
        expect(formatValue(2048, 'bytes')).toBe('2KB');
    });

    it('splits an age into the closest unit', () => {
        expect(splitAge(30)).toEqual({ unit: 'seconds', value: 30 });
        expect(splitAge(600)).toEqual({ unit: 'minutes', value: 10 });
        expect(splitAge(7200)).toEqual({ unit: 'hours', value: 2 });
    });
});

describe('toChartData', () => {
    it('keeps ms timestamps and nulls', () => {
        const data = toChartData([
            [
                { t: 1000, v: 1 },
                { t: 2000, v: null },
            ],
            [
                { t: 1000, v: 5 },
                { t: 2000, v: 6 },
            ],
        ]);

        expect(data).toEqual({
            times: [1000, 2000],
            values: [
                [1, null],
                [5, 6],
            ],
        });
    });

    it('handles no series and detects empty data', () => {
        expect(toChartData([])).toEqual({ times: [], values: [] });
        expect(hasAnyValue([[{ t: 1, v: null }]])).toBe(false);
        expect(hasAnyValue([[{ t: 1, v: 0 }]])).toBe(true);
    });
});
