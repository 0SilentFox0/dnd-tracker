import { MINUTE_MS } from '@/lib/constants/time';
import { LATENCY_BOUNDS, LATENCY_INF } from '@/lib/ops/metrics-catalog';

export interface SeedRow {
    bucket: Date;
    metric: string;
    labels: string;
    n: number;
    sum: number;
    max: number;
}

const DAY_MS = 86_400_000;

/** Deterministic noise in [0, 1) so reruns give the same picture. */
function noise(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;

    return x - Math.floor(x);
}

const wave = (t: number, periodMs: number, phase = 0) =>
    (Math.sin((t / periodMs) * 2 * Math.PI + phase) + 1) / 2;

interface GaugeDef {
    metric: string;
    labels?: string;
    at: (t: number) => number;
}

const startOfDay = (t: number) => Math.floor(t / DAY_MS) * DAY_MS;

const startOfMonth = (t: number) => {
    const d = new Date(t);

    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

const monthDays = (t: number) => (t - startOfMonth(t)) / DAY_MS;

const GAUGES: GaugeDef[] = [
    {
        metric: 'db.connections',
        labels: 'state=total',
        at: (t) =>
            8 + 26 * wave(t, DAY_MS) + 10 * (t % 7_200_000 > 6_600_000 ? 1 : 0),
    },
    {
        metric: 'db.connections',
        labels: 'state=active',
        at: (t) => 2 + 6 * wave(t, DAY_MS, 1),
    },
    {
        metric: 'db.connections',
        labels: 'state=idle_in_tx',
        at: (t) => Math.round(2 * noise(t / MINUTE_MS)),
    },
    { metric: 'db.max_connections', at: () => 60 },
    {
        metric: 'db.longest_tx_s',
        at: (t) => (noise(t / MINUTE_MS) > 0.97 ? 12 : 0.4 + noise(t) * 2),
    },
    {
        metric: 'db.waiting_locks',
        at: (t) => Math.floor(noise(t / MINUTE_MS) * 1.3),
    },
    {
        metric: 'db.size_bytes',
        at: (t) => 120e6 + monthDays(t) * 4e6,
    },
    {
        metric: 'db.cache_hit_ratio',
        at: (t) => 0.96 + 0.03 * wave(t, DAY_MS, 2),
    },
    { metric: 'db.deadlocks', at: () => 0 },
    {
        metric: 'app.active_battles',
        at: (t) => Math.round(4 * wave(t, DAY_MS, 3)),
    },
    { metric: 'collector.heartbeat', at: (t) => t / 1000 },
    {
        metric: 'provider.pusher.channels_occupied',
        at: (t) => 3 + Math.round(20 * wave(t, DAY_MS, 3)),
    },
    {
        metric: 'provider.pusher.connections',
        at: (t) => 6 + Math.round(70 * wave(t, DAY_MS, 3)),
    },
    {
        metric: 'provider.cloudflare.requests_day',
        at: (t) => ((t - startOfDay(t)) / DAY_MS) * 1500,
    },
    {
        metric: 'provider.supabase.egress_bytes',
        at: (t) => monthDays(t) * 1e8,
    },
    {
        metric: 'provider.vercel.invocations',
        at: (t) => monthDays(t) * 6_000,
    },
    {
        metric: 'provider.vercel.bandwidth_bytes',
        at: (t) => monthDays(t) * 6e8,
    },
    {
        metric: 'provider.upstash.commands_month',
        at: (t) => monthDays(t) * 9_000,
    },
];

interface CounterDef {
    metric: string;
    labels: string;
    perMinute: (t: number) => number;
}

const COUNTERS: CounterDef[] = [
    {
        metric: 'battle.conflict',
        labels: '',
        perMinute: (t) => (noise(t) > 0.8 ? 1 : 0) * 4 * wave(t, DAY_MS, 3),
    },
    {
        metric: 'db.pool_timeout',
        labels: '',
        perMinute: (t) => (noise(t / 3) > 0.995 ? 2 : 0),
    },
    {
        metric: 'api.error5xx',
        labels: 'kind=other',
        perMinute: (t) => (noise(t / 5) > 0.93 ? 1 : 0),
    },
    {
        metric: 'pusher.trigger',
        labels: 'result=ok',
        perMinute: (t) => 40 * wave(t, DAY_MS, 3),
    },
    {
        metric: 'pusher.trigger',
        labels: 'result=fail',
        perMinute: (t) => (noise(t / 7) > 0.96 ? 1 : 0),
    },
    {
        metric: 'ratelimit.denied',
        labels: 'scope=battle',
        perMinute: (t) => (noise(t / 11) > 0.9 ? 2 : 0),
    },
    {
        metric: 'ratelimit.degraded',
        labels: 'mode=open',
        perMinute: (t) => (noise(t / 13) > 0.985 ? 1 : 0),
    },
];

const OPS = ['attack', 'move', 'end-turn'];

/** One bucket per `stepMs` in [fromMs, toMs); `stepMs` of an hour aggregates 60 minutes of the same shapes. */
export function buildSeedRows(
    fromMs: number,
    toMs: number,
    stepMs: number
): SeedRow[] {
    const rows: SeedRow[] = [];

    const minutes = Math.round(stepMs / MINUTE_MS);

    for (
        let start = Math.ceil(fromMs / stepMs) * stepMs;
        start < toMs;
        start += stepMs
    ) {
        const bucket = new Date(start);

        const times = Array.from(
            { length: minutes },
            (_, i) => start + i * MINUTE_MS
        );

        for (const g of GAUGES) {
            const values = times.map(g.at);

            rows.push({
                bucket,
                metric: g.metric,
                labels: g.labels ?? '',
                n: minutes,
                sum: values.reduce((a, b) => a + b, 0),
                max: Math.max(...values),
            });
        }

        for (const c of COUNTERS) {
            const sum = times.reduce((acc, t) => acc + c.perMinute(t), 0);

            if (sum > 0)
                rows.push({
                    bucket,
                    metric: c.metric,
                    labels: c.labels,
                    n: Math.max(1, Math.round(sum)),
                    sum,
                    max: sum,
                });
        }

        for (const op of OPS) {
            const calls = times.reduce(
                (acc, t) =>
                    acc +
                    Math.round(
                        12 * wave(t, DAY_MS, 3) * (op === 'attack' ? 1 : 0.5)
                    ),
                0
            );

            if (calls === 0) continue;

            const spread = [0.5, 0.25, 0.12, 0.08, 0.03, 0.015, 0.004, 0.001];

            const bounds = [...LATENCY_BOUNDS.map(String), LATENCY_INF];

            const slow = noise(start / MINUTE_MS) > 0.9 ? 6 : 1;

            let total = 0;

            bounds.forEach((le, i) => {
                const count = Math.round(
                    calls * spread[i] * (i >= 4 ? slow : 1)
                );

                if (count === 0) return;

                total += count;
                rows.push({
                    bucket,
                    metric: 'battle.mutation:le',
                    labels: `le=${le},op=${op}`,
                    n: count,
                    sum: count,
                    max: count,
                });
            });

            rows.push({
                bucket,
                metric: 'battle.mutation:count',
                labels: `op=${op}`,
                n: total,
                sum: total,
                max: total,
            });
            rows.push({
                bucket,
                metric: 'battle.mutation:sum',
                labels: `op=${op}`,
                n: total,
                sum: total * 140,
                max: total * 140,
            });
        }
    }

    return rows;
}
