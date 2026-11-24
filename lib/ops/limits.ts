import type { ProviderName } from '@/lib/ops/metrics-catalog';

export type Tier = 'free' | 'paid';
export interface Limit {
    value: number | null;
    unit: 'count' | 'bytes';
    period: 'now' | 'day' | 'month';
}

const MB = 1024 ** 2;

const GB = 1024 ** 3;

// Values from public pricing pages as known on 2026-11-24; owner must confirm before relying on them.
export const PROVIDER_LIMITS: Record<
    ProviderName,
    Record<Tier, Record<string, Limit>>
> = {
    supabase: {
        free: {
            dbBytes: { value: 500 * MB, unit: 'bytes', period: 'now' },
            egressBytesPerMonth: {
                value: 5 * GB,
                unit: 'bytes',
                period: 'month',
            },
        },
        paid: {
            dbBytes: { value: 8 * GB, unit: 'bytes', period: 'now' },
            egressBytesPerMonth: {
                value: 250 * GB,
                unit: 'bytes',
                period: 'month',
            },
        },
    },
    vercel: {
        free: {
            bandwidthBytesPerMonth: {
                value: 100 * GB,
                unit: 'bytes',
                period: 'month',
            },
            invocationsPerMonth: {
                value: 1_000_000,
                unit: 'count',
                period: 'month',
            },
        },
        paid: {
            bandwidthBytesPerMonth: {
                value: 1024 * GB,
                unit: 'bytes',
                period: 'month',
            },
            invocationsPerMonth: {
                value: 10_000_000,
                unit: 'count',
                period: 'month',
            },
        },
    },
    pusher: {
        free: {
            connections: { value: 100, unit: 'count', period: 'now' },
            messagesPerDay: { value: 200_000, unit: 'count', period: 'day' },
        },
        paid: {
            connections: { value: 500, unit: 'count', period: 'now' },
            messagesPerDay: { value: 1_000_000, unit: 'count', period: 'day' },
        },
    },
    upstash: {
        free: {
            commandsPerMonth: {
                value: 500_000,
                unit: 'count',
                period: 'month',
            },
        },
        paid: {
            commandsPerMonth: { value: null, unit: 'count', period: 'month' },
        },
    },
    cloudflare: {
        free: {
            requestsPerDay: { value: 100_000, unit: 'count', period: 'day' },
        },
        paid: {
            requestsPerDay: { value: null, unit: 'count', period: 'day' },
        },
    },
};

export function activeTier(
    provider: ProviderName,
    env: Record<string, string | undefined> = process.env
): Tier {
    return env[`OPS_TIER_${provider.toUpperCase()}`]?.toLowerCase() === 'paid'
        ? 'paid'
        : 'free';
}

export function limitFor(
    provider: ProviderName,
    key: string,
    env?: Record<string, string | undefined>
): Limit | null {
    return PROVIDER_LIMITS[provider][activeTier(provider, env)][key] ?? null;
}

// Provider gauge -> the limit key it is measured against.
export const PROVIDER_METRIC_LIMITS: Record<
    string,
    { provider: ProviderName; key: string }
> = {
    'provider.cloudflare.requests_day': {
        provider: 'cloudflare',
        key: 'requestsPerDay',
    },
    'provider.pusher.connections': { provider: 'pusher', key: 'connections' },
    'provider.supabase.egress_bytes': {
        provider: 'supabase',
        key: 'egressBytesPerMonth',
    },
    'provider.vercel.bandwidth_bytes': {
        provider: 'vercel',
        key: 'bandwidthBytesPerMonth',
    },
    'provider.vercel.invocations': {
        provider: 'vercel',
        key: 'invocationsPerMonth',
    },
    'provider.upstash.commands_month': {
        provider: 'upstash',
        key: 'commandsPerMonth',
    },
};
