import { describe, expect, it } from 'vitest';

import { buildSeedRows } from '../lib/fake-metrics';

import { isKnownMetric } from '@/lib/ops/metrics-catalog';

const base = (metric: string) => metric.replace(/:(le|count|sum)$/, '');

describe('buildSeedRows', () => {
    const rows = buildSeedRows(0, 10 * 60_000, 60_000);

    it('only uses catalog metrics and canonical labels', () => {
        for (const row of rows) {
            expect(isKnownMetric(base(row.metric)), row.metric).toBe(true);
            expect(row.labels).toMatch(
                /^([a-z0-9_]+=[a-z0-9_.-]+(,[a-z0-9_]+=[a-z0-9_.-]+)*)?$/
            );
        }
    });

    it('is deterministic and unique per key', () => {
        expect(buildSeedRows(0, 10 * 60_000, 60_000)).toEqual(rows);

        const keys = rows.map(
            (r) => `${r.bucket.getTime()}|${r.metric}|${r.labels}`
        );

        expect(new Set(keys).size).toBe(keys.length);
    });

    it('writes the heartbeat for every bucket', () => {
        expect(
            rows.filter((r) => r.metric === 'collector.heartbeat')
        ).toHaveLength(10);
    });

    it('aggregates an hour of minutes into hourly buckets', () => {
        const hourly = buildSeedRows(0, 2 * 3_600_000, 3_600_000);

        const total = hourly.find(
            (r) => r.metric === 'db.connections' && r.labels === 'state=total'
        );

        expect(total?.n).toBe(60);
    });
});
