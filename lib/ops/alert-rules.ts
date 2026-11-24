import { PROVIDER_METRIC_LIMITS } from '@/lib/ops/limits';
import type { ProviderName } from '@/lib/ops/metrics-catalog';

export type AlertWindow = '1m' | '5m' | '15m' | '1h' | '24h';

export const WINDOW_MINUTES: Record<AlertWindow, number> = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '1h': 60,
    '24h': 1440,
};

export type AlertAgg = 'sum' | 'avg' | 'max' | 'p95' | 'age' | 'expiryDays';

export interface AlertRule {
    id: string;
    metric: string;
    labels?: string;
    window: AlertWindow;
    agg: AlertAgg;
    per?: { metric: string; labels?: string; agg: 'sum' | 'avg' | 'max' };
    limit?: { provider: ProviderName; key: string };
    fanout?: boolean;
    direction?: 'above' | 'below';
    warn?: number;
    crit?: number;
    forMinutes: number;
    cooldownMinutes: number;
    severityNote: string;
}

const COOLDOWN = 30;

const providerRules: AlertRule[] = Object.entries(PROVIDER_METRIC_LIMITS).map(
    ([metric, limit]) => ({
        id: metric,
        metric,
        window: '1h',
        agg: 'max',
        limit,
        warn: 0.7,
        crit: 0.9,
        forMinutes: 0,
        cooldownMinutes: 360,
        severityNote: `${limit.provider} usage is approaching its limit`,
    })
);

export const ALERT_RULES: AlertRule[] = [
    {
        id: 'db.connections',
        metric: 'db.connections',
        labels: 'state=total',
        window: '1m',
        agg: 'avg',
        per: { metric: 'db.max_connections', agg: 'avg' },
        warn: 0.7,
        crit: 0.9,
        forMinutes: 2,
        cooldownMinutes: COOLDOWN,
        severityNote: 'Database connections are close to max_connections',
    },
    {
        id: 'db.pool_timeout',
        metric: 'db.pool_timeout',
        window: '5m',
        agg: 'sum',
        warn: 1,
        crit: 10,
        forMinutes: 0,
        cooldownMinutes: COOLDOWN,
        severityNote: 'Prisma pool timeouts (P2024)',
    },
    {
        id: 'db.unreachable',
        metric: 'db.unreachable',
        window: '5m',
        agg: 'sum',
        warn: 1,
        crit: 3,
        forMinutes: 0,
        cooldownMinutes: COOLDOWN,
        severityNote: 'Database unreachable errors',
    },
    {
        id: 'db.longest_tx',
        metric: 'db.longest_tx_s',
        window: '1m',
        agg: 'max',
        warn: 10,
        crit: 30,
        forMinutes: 1,
        cooldownMinutes: COOLDOWN,
        severityNote: 'Long-running transaction (seconds)',
    },
    {
        id: 'db.size',
        metric: 'db.size_bytes',
        window: '15m',
        agg: 'max',
        limit: { provider: 'supabase', key: 'dbBytes' },
        warn: 0.7,
        crit: 0.9,
        forMinutes: 0,
        cooldownMinutes: 360,
        severityNote: 'Database size is close to the plan limit',
    },
    {
        id: 'battle.p95',
        metric: 'battle.mutation',
        window: '5m',
        agg: 'p95',
        warn: 1500,
        crit: 3000,
        forMinutes: 3,
        cooldownMinutes: COOLDOWN,
        severityNote: 'Battle mutation p95 latency (ms)',
    },
    {
        id: 'battle.conflict_rate',
        metric: 'battle.conflict',
        window: '5m',
        agg: 'sum',
        per: { metric: 'battle.mutation:count', agg: 'sum' },
        warn: 0.05,
        crit: 0.15,
        forMinutes: 3,
        cooldownMinutes: COOLDOWN,
        severityNote: 'Share of battle mutations ending in a conflict',
    },
    {
        id: 'api.5xx',
        metric: 'api.error5xx',
        window: '5m',
        agg: 'sum',
        warn: 10,
        crit: 50,
        forMinutes: 0,
        cooldownMinutes: COOLDOWN,
        severityNote: 'API 5xx responses',
    },
    {
        id: 'pusher.messages_day',
        metric: 'pusher.trigger',
        window: '24h',
        agg: 'sum',
        fanout: true,
        limit: { provider: 'pusher', key: 'messagesPerDay' },
        warn: 0.7,
        crit: 0.9,
        forMinutes: 0,
        cooldownMinutes: 360,
        severityNote: 'Estimated Pusher messages per day vs limit',
    },
    {
        id: 'pusher.trigger_fail',
        metric: 'pusher.trigger',
        labels: 'result=fail',
        window: '5m',
        agg: 'sum',
        warn: 5,
        crit: 30,
        forMinutes: 0,
        cooldownMinutes: COOLDOWN,
        severityNote: 'Pusher trigger failures',
    },
    {
        id: 'ratelimit.degraded',
        metric: 'ratelimit.degraded',
        window: '5m',
        agg: 'sum',
        warn: 1,
        crit: 20,
        forMinutes: 0,
        cooldownMinutes: COOLDOWN,
        severityNote: 'Rate limiter running in degraded mode',
    },
    ...providerRules,
    {
        id: 'collector.silent',
        metric: 'collector.heartbeat',
        window: '1h',
        agg: 'age',
        warn: 3,
        crit: 10,
        forMinutes: 0,
        cooldownMinutes: COOLDOWN,
        severityNote: 'Minutes since the last collector heartbeat',
    },
    {
        id: 'secrets.expiry',
        metric: 'secrets.expiry',
        window: '1m',
        agg: 'expiryDays',
        direction: 'below',
        warn: 14,
        crit: 3,
        forMinutes: 0,
        cooldownMinutes: 1440,
        severityNote: 'Days until a tracked secret expires',
    },
];
