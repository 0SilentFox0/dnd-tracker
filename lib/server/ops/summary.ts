import 'server-only';
import { prisma } from '@/lib/db';
import { ALERT_RULES } from '@/lib/ops/alert-rules';
import { activeTier, limitFor, PROVIDER_METRIC_LIMITS } from '@/lib/ops/limits';
import { PROVIDER_NAMES } from '@/lib/ops/metrics-catalog';
import { loadRows, seriesWindow } from '@/lib/server/ops/read-series';
import { asStatus } from '@/lib/utils/ops/alert-state';
import {
    aggregateSeries,
    type SeriesSpec,
    sourceMetric,
} from '@/lib/utils/ops/series';
import {
    buildLimitRow,
    lastValue,
    STALE_READING_MS,
    worstStatus,
} from '@/lib/utils/ops/summary';
import type { OpsSeriesPoint, OpsSummary } from '@/types/ops';

const LIMIT_GAUGES = [
    ...Object.entries(PROVIDER_METRIC_LIMITS).map(([metric, l]) => ({
        id: metric,
        metric,
        provider: l.provider,
        key: l.key,
    })),
    {
        id: 'db.size',
        metric: 'db.size_bytes',
        provider: 'supabase' as const,
        key: 'dbBytes',
    },
];

const gaugeSpec = (metric: string): SeriesSpec => ({
    key: metric,
    metric,
    labels: '',
    agg: 'max',
});

export async function buildSummary(
    now: Date = new Date()
): Promise<OpsSummary> {
    const { stepMs, fromMs, toMs } = seriesWindow('24h', now);

    const metrics = [
        ...LIMIT_GAUGES.map((g) => g.metric),
        'collector.heartbeat',
    ];

    const [rows, states] = await Promise.all([
        loadRows(metrics, new Date(fromMs), now, false),
        prisma.opsAlertState.findMany({ where: { status: { not: 'ok' } } }),
    ]);

    const cache = new Map<string, OpsSeriesPoint[]>();

    const points = (metric: string) => {
        let cached = cache.get(metric);

        if (!cached) {
            const spec = gaugeSpec(metric);

            cached = aggregateSeries(
                rows.get(sourceMetric(spec)) ?? [],
                spec,
                fromMs,
                toMs,
                stepMs
            );
            cache.set(metric, cached);
        }

        return cached;
    };

    const limits = LIMIT_GAUGES.map((g) => {
        const rule = ALERT_RULES.find((r) => r.id === g.id);

        return buildLimitRow({
            rule: rule ?? { id: g.id, warn: 0.7, crit: 0.9 },
            provider: g.provider,
            metric: g.metric,
            limit: limitFor(g.provider, g.key),
            points: points(g.metric),
        });
    });

    const fresh = (m: string) => {
        const last = points(m).findLast((p) => p.v !== null);

        return !!last && now.getTime() - last.t <= STALE_READING_MS;
    };

    const providers = PROVIDER_NAMES.map((name) => ({
        name,
        tier: activeTier(name),
        available: limits.some(
            (l) => l.provider === name && l.value !== null && fresh(l.metric)
        ),
        status: worstStatus(
            limits.filter((l) => l.provider === name).map((l) => l.status)
        ),
    }));

    const heartbeat = lastValue(points('collector.heartbeat'));

    return {
        generatedAt: now.toISOString(),
        heartbeatAgeSec:
            heartbeat === null
                ? null
                : Math.max(0, Math.round(now.getTime() / 1000 - heartbeat)),
        providers,
        limits,
        activeAlerts: states.map((s) => ({
            rule: s.rule,
            status: asStatus(s.status),
            since: s.since.toISOString(),
            lastValue: s.lastValue,
            silencedUntil: s.silencedUntil?.toISOString() ?? null,
        })),
    };
}
