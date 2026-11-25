import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CHART_GROUPS } from '../chart-groups';
import { PROVIDER_METRIC_LIMITS } from '../limits';

const load = (locale: string) =>
    JSON.parse(
        readFileSync(
            join(process.cwd(), 'messages', locale, 'ops.json'),
            'utf8'
        )
    ) as Record<string, unknown>;

const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object'
            ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
            : [`${prefix}${k}`]
    );

describe('ops messages', () => {
    it('has identical keys in uk and en', () => {
        expect(flatten(load('uk')).sort()).toEqual(flatten(load('en')).sort());
    });

    it('covers every chart, series and limit name', () => {
        const keys = new Set(flatten(load('en')));

        for (const group of CHART_GROUPS) {
            expect(keys.has(`charts.groups.${group.id}`)).toBe(true);

            for (const chart of group.charts) {
                expect(keys.has(`charts.items.${chart.id}`), chart.id).toBe(
                    true
                );

                for (const s of chart.series)
                    expect(keys.has(`charts.series.${s.id}`), s.id).toBe(true);
            }
        }

        for (const metric of [
            ...Object.keys(PROVIDER_METRIC_LIMITS),
            'db.size',
        ])
            expect(
                keys.has(`limits.names.${metric.replaceAll('.', '_')}`),
                metric
            ).toBe(true);
    });
});
