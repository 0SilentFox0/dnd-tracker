import { describe, expect, it } from 'vitest';

import {
    aggregateSeries,
    parseSeriesKey,
    sourceMetric,
    stepFor,
} from '../series';

describe('parseSeriesKey', () => {
    it('maps kinds to aggregations', () => {
        expect(parseSeriesKey('api.error5xx')?.agg).toBe('sum');
        expect(parseSeriesKey('db.size_bytes')?.agg).toBe('max');
        expect(parseSeriesKey('api.error5xx:rate')?.agg).toBe('rate');
        expect(parseSeriesKey('battle.mutation:p95')?.agg).toBe('p95');
    });

    it('parses a single label', () => {
        expect(parseSeriesKey('db.connections{state=total}')?.labels).toBe(
            'state=total'
        );
    });

    it('rejects unknown, timing without quantile and rate on gauges', () => {
        expect(parseSeriesKey('nope.metric')).toBeNull();
        expect(parseSeriesKey('battle.mutation')).toBeNull();
        expect(parseSeriesKey('db.size_bytes:rate')).toBeNull();
        expect(parseSeriesKey('db.size_bytes:p95')).toBeNull();
    });

    it('accepts provider gauges', () => {
        expect(parseSeriesKey('provider.cloudflare.requests_day')?.agg).toBe(
            'max'
        );
    });
});

describe('stepFor', () => {
    it('keeps at most 240 points', () => {
        expect(stepFor('1h', 60_000)).toBe(60_000);
        expect(stepFor('24h', 60_000)).toBe(6 * 60_000);
        expect(stepFor('7d', 3_600_000)).toBe(3_600_000);
    });
});

describe('aggregateSeries', () => {
    const min = 60_000;

    it('sums counters per bin and leaves gaps as null', () => {
        const spec = parseSeriesKey('api.error5xx')!;

        const rows = [
            { t: 0, labels: '', n: 1, sum: 2, max: 2 },
            { t: min, labels: '', n: 1, sum: 3, max: 3 },
            { t: 4 * min, labels: '', n: 1, sum: 7, max: 7 },
        ];

        const out = aggregateSeries(rows, spec, 0, 6 * min, 2 * min);

        expect(out.map((p) => p.v)).toEqual([5, null, 7]);
    });

    it('computes rate per minute', () => {
        const spec = parseSeriesKey('api.error5xx:rate')!;

        const out = aggregateSeries(
            [{ t: 0, labels: '', n: 1, sum: 6, max: 6 }],
            spec,
            0,
            2 * min,
            2 * min
        );

        expect(out[0].v).toBe(3);
    });

    it('takes the max for gauges and filters by label', () => {
        const spec = parseSeriesKey('db.connections{state=total}')!;

        const out = aggregateSeries(
            [
                { t: 0, labels: 'state=total', n: 1, sum: 4, max: 4 },
                { t: min, labels: 'state=total', n: 1, sum: 9, max: 9 },
                { t: min, labels: 'state=idle', n: 1, sum: 99, max: 99 },
            ],
            spec,
            0,
            2 * min,
            2 * min
        );

        expect(out[0].v).toBe(9);
    });

    it('derives p95 from le buckets and ignores other labels', () => {
        const spec = parseSeriesKey('battle.mutation{op=attack}:p95')!;

        expect(sourceMetric(spec)).toBe('battle.mutation:le');

        const rows = [
            { t: 0, labels: 'le=50,op=attack', n: 1, sum: 90, max: 90 },
            { t: 0, labels: 'le=200,op=attack', n: 1, sum: 10, max: 10 },
            { t: 0, labels: 'le=3200,op=other', n: 1, sum: 500, max: 500 },
        ];

        const [point] = aggregateSeries(rows, spec, 0, min, min);

        expect(point.v).toBeGreaterThan(50);
        expect(point.v).toBeLessThanOrEqual(200);
    });
});

describe('aggregateSeries without a label', () => {
    it('sums counters across label sets', () => {
        const spec = parseSeriesKey('pusher.trigger')!;

        const [p] = aggregateSeries(
            [
                { t: 0, labels: 'result=ok', n: 1, sum: 5, max: 5 },
                { t: 0, labels: 'result=fail', n: 1, sum: 2, max: 2 },
            ],
            spec,
            0,
            60_000,
            60_000
        );

        expect(p.v).toBe(7);
    });
});
