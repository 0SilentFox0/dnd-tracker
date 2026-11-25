export const LATENCY_BOUNDS = [50, 100, 200, 400, 800, 1600, 3200] as const;
export const LATENCY_INF = 'inf';

export const PROVIDER_NAMES = [
    'cloudflare',
    'pusher',
    'supabase',
    'upstash',
    'vercel',
] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

export type MetricKind = 'counter' | 'gauge' | 'timing';
type LabelSpec = readonly string[] | RegExp;

export interface MetricDef {
    kind: MetricKind;
    labels?: Record<string, LabelSpec>;
}

const SAFE_VALUE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export const METRICS = {
    'battle.mutation': { kind: 'timing', labels: { op: SAFE_VALUE } },
    'battle.conflict': { kind: 'counter' },
    'db.pool_timeout': { kind: 'counter' },
    'db.unreachable': { kind: 'counter' },
    'api.error5xx': { kind: 'counter', labels: { kind: ['prisma', 'other'] } },
    'pusher.trigger': { kind: 'counter', labels: { result: ['ok', 'fail'] } },
    'ratelimit.denied': { kind: 'counter', labels: { scope: SAFE_VALUE } },
    'ratelimit.degraded': {
        kind: 'counter',
        labels: { mode: ['open', 'closed'] },
    },
    'db.connections': {
        kind: 'gauge',
        labels: { state: ['active', 'idle', 'idle_in_tx', 'total'] },
    },
    'db.max_connections': { kind: 'gauge' },
    'db.longest_tx_s': { kind: 'gauge' },
    'db.waiting_locks': { kind: 'gauge' },
    'db.size_bytes': { kind: 'gauge' },
    'db.cache_hit_ratio': { kind: 'gauge' },
    'db.deadlocks': { kind: 'gauge' },
    'app.active_battles': { kind: 'gauge' },
    'collector.heartbeat': { kind: 'gauge' },
} as const satisfies Record<string, MetricDef>;

export type StaticMetricKey = keyof typeof METRICS;
export type ProviderMetricKey = `provider.${ProviderName}.${string}`;
export type MetricKey = StaticMetricKey | ProviderMetricKey;

const PROVIDER_PATTERN = new RegExp(
    `^provider\\.(${PROVIDER_NAMES.join('|')})\\.[a-z0-9_]{1,48}$`
);

export function isKnownMetric(key: string): key is MetricKey {
    return Object.hasOwn(METRICS, key) || PROVIDER_PATTERN.test(key);
}

export function metricDef(key: string): MetricDef | null {
    if (Object.hasOwn(METRICS, key)) return METRICS[key as StaticMetricKey];

    return PROVIDER_PATTERN.test(key) ? { kind: 'gauge' } : null;
}

function allowed(spec: LabelSpec, value: string): boolean {
    return Array.isArray(spec)
        ? spec.includes(value)
        : (spec as RegExp).test(value);
}

/** Sorted `k=v` pairs; keys or values outside the catalog are dropped to bound cardinality. */
export function canonicalLabels(
    labels: Record<string, string> | undefined,
    key?: string
): string {
    if (!labels) return '';

    const specs = key
        ? (metricDef(key)?.labels as Record<string, LabelSpec> | undefined)
        : undefined;

    return Object.keys(labels)
        .sort()
        .filter((k) => {
            const value = labels[k];

            if (key) {
                const spec = specs?.[k];

                return spec !== undefined && allowed(spec, value);
            }

            return /^[a-z0-9_]+$/.test(k) && /^[a-z0-9_.-]+$/.test(value);
        })
        .map((k) => `${k}=${labels[k]}`)
        .join(',');
}
