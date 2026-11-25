import { MINUTE_MS } from '@/lib/constants/time';
import { isKnownMetric, metricDef } from '@/lib/ops/metrics-catalog';
import { quantileFromBuckets } from '@/lib/utils/ops/latency';
import type { OpsRange, OpsSeriesPoint } from '@/types/ops';

export const MAX_POINTS = 240;

export const RANGE_MS: Record<OpsRange, number> = {
    '1h': 3_600_000,
    '6h': 6 * 3_600_000,
    '24h': 24 * 3_600_000,
    '7d': 7 * 24 * 3_600_000,
};

export type SeriesAgg = 'sum' | 'max' | 'rate' | 'p50' | 'p95';

export interface SeriesSpec {
    key: string;
    metric: string;
    labels: string;
    agg: SeriesAgg;
}

export interface SeriesRow {
    t: number;
    labels: string;
    n: number;
    sum: number;
    max: number;
}

const KEY_PATTERN =
    /^([a-z0-9_.]+)(?:\{([a-z0-9_]+)=([a-z0-9_.-]+)\})?(?::(p50|p95|rate))?$/;

/** `metric`, `metric{k=v}`, optionally suffixed `:p50`, `:p95` or `:rate`. Null for anything unknown. */
export function parseSeriesKey(key: string): SeriesSpec | null {
    const m = KEY_PATTERN.exec(key);

    if (!m || !isKnownMetric(m[1])) return null;

    const def = metricDef(m[1]);

    if (!def) return null;

    const derived = m[4] as 'p50' | 'p95' | 'rate' | undefined;

    const isTiming = def.kind === 'timing';

    if (isTiming !== (derived === 'p50' || derived === 'p95')) return null;

    if (derived === 'rate' && def.kind !== 'counter') return null;

    const agg: SeriesAgg = derived ?? (def.kind === 'counter' ? 'sum' : 'max');

    return {
        key,
        metric: m[1],
        labels: m[2] ? `${m[2]}=${m[3]}` : '',
        agg,
    };
}

/** Source metric name in the buckets table for a spec (timings are stored as `<key>:le`). */
export const sourceMetric = (spec: SeriesSpec): string =>
    spec.agg === 'p50' || spec.agg === 'p95'
        ? `${spec.metric}:le`
        : spec.metric;

const withoutLe = (labels: string): string =>
    labels
        .split(',')
        .filter((p) => p && !p.startsWith('le='))
        .join(',');

/** No label in the key: counters add up every label set, gauges read only the unlabeled row. */
function matchesLabels(labels: string, spec: SeriesSpec): boolean {
    if (spec.labels) return labels === spec.labels;

    return spec.agg === 'max' ? labels === '' : true;
}

export function stepFor(range: OpsRange, bucketMs: number): number {
    const span = RANGE_MS[range];

    const raw = Math.ceil(span / MAX_POINTS / bucketMs) * bucketMs;

    return Math.max(raw, bucketMs);
}

/** Bins rows into `stepMs` buckets over [fromMs, toMs); empty bins are null so charts show gaps. */
export function aggregateSeries(
    rows: SeriesRow[],
    spec: SeriesSpec,
    fromMs: number,
    toMs: number,
    stepMs: number
): OpsSeriesPoint[] {
    const count = Math.max(1, Math.ceil((toMs - fromMs) / stepMs));

    const sums = new Array<number>(count).fill(0);

    const maxes = new Array<number | null>(count).fill(null);

    const hasData = new Array<boolean>(count).fill(false);

    const le: Record<string, number>[] = Array.from(
        { length: count },
        () => ({})
    );

    const quantile = spec.agg === 'p50' || spec.agg === 'p95';

    for (const row of rows) {
        const i = Math.floor((row.t - fromMs) / stepMs);

        if (i < 0 || i >= count) continue;

        if (quantile) {
            if (spec.labels && withoutLe(row.labels) !== spec.labels) continue;

            const bound = /(?:^|,)le=([^,]+)/.exec(row.labels)?.[1];

            if (!bound) continue;

            le[i][bound] = (le[i][bound] ?? 0) + row.sum;
            hasData[i] = true;
            continue;
        }

        if (!matchesLabels(row.labels, spec)) continue;

        sums[i] += row.sum;
        maxes[i] = Math.max(maxes[i] ?? -Infinity, row.max);
        hasData[i] = true;
    }

    const q = spec.agg === 'p50' ? 0.5 : 0.95;

    return Array.from({ length: count }, (_, i) => {
        const t = fromMs + i * stepMs;

        if (!hasData[i]) return { t, v: null };

        if (quantile) return { t, v: quantileFromBuckets(le[i], q) };

        if (spec.agg === 'max') return { t, v: maxes[i] };

        if (spec.agg === 'rate')
            return { t, v: sums[i] / (stepMs / MINUTE_MS) };

        return { t, v: sums[i] };
    });
}
