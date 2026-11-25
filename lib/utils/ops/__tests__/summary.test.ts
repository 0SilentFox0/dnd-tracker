import { describe, expect, it } from 'vitest';

import { buildLimitRow, lastValue, worstStatus } from '../summary';

const rule = { id: 'x', warn: 0.7, crit: 0.9 };

const limit = { value: 100, unit: 'count', period: 'day' } as const;

describe('buildLimitRow', () => {
    it('computes percent and status from the last value', () => {
        const row = buildLimitRow({
            rule,
            provider: 'pusher',
            metric: 'm',
            limit,
            points: [
                { t: 0, v: 10 },
                { t: 1, v: 95 },
                { t: 2, v: null },
            ],
        });

        expect(row.value).toBe(95);
        expect(row.percent).toBeCloseTo(0.95);
        expect(row.status).toBe('crit');
    });

    it('has no percent or status without a limit value', () => {
        const row = buildLimitRow({
            rule,
            provider: 'upstash',
            metric: 'm',
            limit: { ...limit, value: null },
            points: [{ t: 0, v: 5 }],
        });

        expect(row.percent).toBeNull();
        expect(row.status).toBeNull();
        expect(row.forecastHours).toBeNull();
    });

    it('forecasts hours to the limit for a growing series', () => {
        const row = buildLimitRow({
            rule,
            provider: 'pusher',
            metric: 'm',
            limit,
            points: [
                { t: 0, v: 10 },
                { t: 3_600_000, v: 20 },
                { t: 7_200_000, v: 30 },
            ],
        });

        expect(row.forecastHours).toBeCloseTo(7);
    });

    it('reports no data as null value', () => {
        const row = buildLimitRow({
            rule,
            provider: 'pusher',
            metric: 'm',
            limit,
            points: [{ t: 0, v: null }],
        });

        expect(row.value).toBeNull();
        expect(row.percent).toBeNull();
    });
});

describe('helpers', () => {
    it('lastValue skips trailing nulls', () => {
        expect(
            lastValue([
                { t: 0, v: 1 },
                { t: 1, v: null },
            ])
        ).toBe(1);
        expect(lastValue([])).toBeNull();
    });

    it('worstStatus ranks crit over warn over ok', () => {
        expect(worstStatus([null, 'ok', 'warn'])).toBe('warn');
        expect(worstStatus(['crit', 'warn'])).toBe('crit');
        expect(worstStatus([null])).toBeNull();
    });
});
