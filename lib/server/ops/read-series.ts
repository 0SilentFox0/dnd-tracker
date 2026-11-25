import 'server-only';
import { HOUR_MS, MINUTE_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';
import {
    aggregateSeries,
    RANGE_MS,
    type SeriesRow,
    type SeriesSpec,
    sourceMetric,
    stepFor,
} from '@/lib/utils/ops/series';
import type { OpsRange, OpsSeriesResponse } from '@/types/ops';

const select = {
    bucket: true,
    metric: true,
    labels: true,
    n: true,
    sum: true,
    max: true,
};

type DbRow = {
    bucket: Date;
    metric: string;
    labels: string;
    n: number;
    sum: number;
    max: number;
};

export async function loadRows(
    metrics: string[],
    from: Date,
    now: Date,
    hourly: boolean
): Promise<Map<string, SeriesRow[]>> {
    const hourStart = new Date(Math.floor(now.getTime() / HOUR_MS) * HOUR_MS);

    const [rolled, minute] = await Promise.all([
        hourly
            ? prisma.opsMetricHourly.findMany({
                  where: {
                      metric: { in: metrics },
                      bucket: { gte: from, lt: hourStart },
                  },
                  select,
              })
            : [],
        prisma.opsMetricBucket.findMany({
            where: {
                metric: { in: metrics },
                bucket: { gte: hourly ? hourStart : from },
            },
            select,
        }),
    ]);

    const byMetric = new Map<string, SeriesRow[]>();

    for (const row of [...rolled, ...minute] as DbRow[]) {
        const list = byMetric.get(row.metric) ?? [];

        list.push({
            t: row.bucket.getTime(),
            labels: row.labels,
            n: row.n,
            sum: row.sum,
            max: row.max,
        });
        byMetric.set(row.metric, list);
    }

    return byMetric;
}

export function seriesWindow(range: OpsRange, now: Date) {
    const hourly = range === '7d';

    const stepMs = stepFor(range, hourly ? HOUR_MS : MINUTE_MS);

    const fromMs =
        Math.floor((now.getTime() - RANGE_MS[range]) / stepMs) * stepMs;

    return { hourly, stepMs, fromMs, toMs: now.getTime() + 1 };
}

export async function readSeries(
    specs: SeriesSpec[],
    range: OpsRange,
    now: Date = new Date()
): Promise<OpsSeriesResponse> {
    const { hourly, stepMs, fromMs, toMs } = seriesWindow(range, now);

    const rows = await loadRows(
        [...new Set(specs.map(sourceMetric))],
        new Date(fromMs),
        now,
        hourly
    );

    const series: OpsSeriesResponse['series'] = {};

    for (const spec of specs) {
        series[spec.key] = aggregateSeries(
            rows.get(sourceMetric(spec)) ?? [],
            spec,
            fromMs,
            toMs,
            stepMs
        );
    }

    return { range, stepMs, series };
}
