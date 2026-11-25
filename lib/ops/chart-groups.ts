import type ops from '@/messages/uk/ops.json';

export type ChartUnit =
    | 'count'
    | 'bytes'
    | 'ms'
    | 'seconds'
    | 'ratio'
    | 'perMin';

export interface ChartSeriesDef {
    id: keyof typeof ops.charts.series;
    key: string;
}

export interface ChartDef {
    id: keyof typeof ops.charts.items;
    unit: ChartUnit;
    limitId?: string;
    series: ChartSeriesDef[];
}

export interface ChartGroup {
    id: 'db' | 'battle' | 'realtime' | 'providers';
    charts: ChartDef[];
}

export const CHART_GROUPS: ChartGroup[] = [
    {
        id: 'db',
        charts: [
            {
                id: 'connections',
                unit: 'count',
                series: [
                    { id: 'total', key: 'db.connections{state=total}' },
                    { id: 'active', key: 'db.connections{state=active}' },
                    { id: 'idleInTx', key: 'db.connections{state=idle_in_tx}' },
                    { id: 'max', key: 'db.max_connections' },
                ],
            },
            {
                id: 'longestTx',
                unit: 'seconds',
                series: [{ id: 'longestTx', key: 'db.longest_tx_s' }],
            },
            {
                id: 'locks',
                unit: 'count',
                series: [{ id: 'waitingLocks', key: 'db.waiting_locks' }],
            },
            {
                id: 'size',
                unit: 'bytes',
                limitId: 'db.size',
                series: [{ id: 'size', key: 'db.size_bytes' }],
            },
            {
                id: 'cache',
                unit: 'ratio',
                series: [{ id: 'cacheHit', key: 'db.cache_hit_ratio' }],
            },
        ],
    },
    {
        id: 'battle',
        charts: [
            {
                id: 'latency',
                unit: 'ms',
                series: [
                    { id: 'p50', key: 'battle.mutation:p50' },
                    { id: 'p95', key: 'battle.mutation:p95' },
                ],
            },
            {
                id: 'conflicts',
                unit: 'perMin',
                series: [{ id: 'conflicts', key: 'battle.conflict:rate' }],
            },
            {
                id: 'activeBattles',
                unit: 'count',
                series: [{ id: 'activeBattles', key: 'app.active_battles' }],
            },
            {
                id: 'errors',
                unit: 'perMin',
                series: [{ id: 'errors5xx', key: 'api.error5xx:rate' }],
            },
        ],
    },
    {
        id: 'realtime',
        charts: [
            {
                id: 'triggers',
                unit: 'perMin',
                series: [
                    { id: 'ok', key: 'pusher.trigger{result=ok}:rate' },
                    { id: 'fail', key: 'pusher.trigger{result=fail}:rate' },
                ],
            },
            {
                id: 'ratelimit',
                unit: 'perMin',
                series: [
                    { id: 'denied', key: 'ratelimit.denied:rate' },
                    { id: 'degraded', key: 'ratelimit.degraded:rate' },
                ],
            },
        ],
    },
    {
        id: 'providers',
        charts: [
            {
                id: 'cloudflare',
                unit: 'count',
                series: [
                    {
                        id: 'requestsDay',
                        key: 'provider.cloudflare.requests_day',
                    },
                ],
            },
            {
                id: 'pusherChannels',
                unit: 'count',
                series: [
                    {
                        id: 'channels',
                        key: 'provider.pusher.channels_occupied',
                    },
                ],
            },
            {
                id: 'supabaseEgress',
                unit: 'bytes',
                series: [
                    { id: 'egress', key: 'provider.supabase.egress_bytes' },
                ],
            },
            {
                id: 'vercelInvocations',
                unit: 'count',
                series: [
                    { id: 'invocations', key: 'provider.vercel.invocations' },
                ],
            },
            {
                id: 'upstashCommands',
                unit: 'count',
                series: [
                    { id: 'commands', key: 'provider.upstash.commands_month' },
                ],
            },
        ],
    },
];

export const PROVIDER_DASHBOARD_URLS: Record<string, string> = {
    supabase: 'https://supabase.com/dashboard',
    vercel: 'https://vercel.com/dashboard',
    pusher: 'https://dashboard.pusher.com',
    upstash: 'https://console.upstash.com',
    cloudflare: 'https://dash.cloudflare.com',
};
