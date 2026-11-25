import { describe, expect, it } from 'vitest';

import { CHART_GROUPS, PROVIDER_DASHBOARD_URLS } from '../chart-groups';
import { PROVIDER_NAMES } from '../metrics-catalog';

import { MAX_SERIES_METRICS } from '@/lib/schemas/ops';
import { parseSeriesKey } from '@/lib/utils/ops/series';

describe('CHART_GROUPS', () => {
    it('uses only valid series keys and fits one request per group', () => {
        for (const group of CHART_GROUPS) {
            const keys = group.charts.flatMap((c) =>
                c.series.map((s) => s.key)
            );

            expect(keys.length).toBeLessThanOrEqual(MAX_SERIES_METRICS);

            for (const key of keys)
                expect(parseSeriesKey(key), key).not.toBeNull();
        }
    });

    it('has unique chart ids and a dashboard link per provider', () => {
        const ids = CHART_GROUPS.flatMap((g) => g.charts.map((c) => c.id));

        expect(new Set(ids).size).toBe(ids.length);

        for (const name of PROVIDER_NAMES)
            expect(PROVIDER_DASHBOARD_URLS[name]).toMatch(/^https:/);
    });
});
