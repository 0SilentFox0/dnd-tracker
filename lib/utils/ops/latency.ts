import { LATENCY_BOUNDS, LATENCY_INF } from '@/lib/ops/metrics-catalog';

const MINUTE_MS = 60_000;

export function bucketStart(date: Date): Date {
    return new Date(Math.floor(date.getTime() / MINUTE_MS) * MINUTE_MS);
}

/** First bound that is >= ms (non-cumulative), `inf` above the last one. */
export function latencyBucket(ms: number): string {
    for (const bound of LATENCY_BOUNDS) if (ms <= bound) return String(bound);

    return LATENCY_INF;
}

/** `counts` is keyed by `le` label; interpolates linearly inside the bucket, `inf` is capped at the last bound. */
export function quantileFromBuckets(
    counts: Record<string, number>,
    q: number
): number | null {
    const order = [...LATENCY_BOUNDS.map(String), LATENCY_INF];

    const total = order.reduce((acc, le) => acc + (counts[le] ?? 0), 0);

    if (total <= 0) return null;

    const target = q * total;

    let seen = 0;

    for (let i = 0; i < order.length; i++) {
        const c = counts[order[i]] ?? 0;

        if (c > 0 && seen + c >= target) {
            const last = LATENCY_BOUNDS[LATENCY_BOUNDS.length - 1];

            if (order[i] === LATENCY_INF) return last;

            const lower = i === 0 ? 0 : LATENCY_BOUNDS[i - 1];

            const upper = LATENCY_BOUNDS[i];

            return lower + ((target - seen) / c) * (upper - lower);
        }

        seen += c;
    }

    return LATENCY_BOUNDS[LATENCY_BOUNDS.length - 1];
}
