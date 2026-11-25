import type { ProviderAdapter } from './types';

import 'server-only';
import { fetchWithTimeout } from '@/lib/server/ops/fetch-with-timeout';

const TIMEOUT_MS = 6000;

type Stats = {
    total_monthly_requests?: number;
    daily_net_commands?: number;
    total_monthly_bandwidth?: number;
    current_storage?: number;
};

const FIELDS = [
    ['commands_month', 'total_monthly_requests'],
    ['commands_day', 'daily_net_commands'],
    ['bandwidth_month_bytes', 'total_monthly_bandwidth'],
    ['storage_bytes', 'current_storage'],
] as const;

export const upstashAdapter: ProviderAdapter = {
    name: 'upstash',
    async collect() {
        const email = process.env.OPS_UPSTASH_EMAIL;

        const key = process.env.OPS_UPSTASH_API_KEY;

        const id = process.env.OPS_UPSTASH_DB_ID;

        if (!email || !key || !id || !/^[A-Za-z0-9-]{8,64}$/.test(id))
            return 'unavailable';

        try {
            const response = await fetchWithTimeout(
                `https://api.upstash.com/v2/redis/stats/${id}?period=1h`,
                {
                    headers: {
                        authorization: `Basic ${Buffer.from(`${email}:${key}`).toString('base64')}`,
                    },
                },
                TIMEOUT_MS
            );

            if (!response.ok) return 'unavailable';

            const stats = (await response.json()) as Stats;

            const readings = FIELDS.flatMap(([metric, field]) =>
                typeof stats[field] === 'number'
                    ? [{ metric, value: stats[field] }]
                    : []
            );

            return readings.length ? readings : 'unavailable';
        } catch {
            return 'unavailable';
        }
    },
};
