import type { ProviderAdapter } from './types';

import 'server-only';
import { fetchWithTimeout } from '@/lib/server/ops/fetch-with-timeout';

const TIMEOUT_MS = 7000;

type Charge = {
    EffectiveCost?: string | number;
    Tags?: { ProjectId?: string };
};

// The FOCUS charges feed is the only documented usage endpoint; raw invocation and bandwidth counts are not exposed.
export const vercelAdapter: ProviderAdapter = {
    name: 'vercel',
    async collect() {
        const token = process.env.OPS_VERCEL_TOKEN;

        if (!token) return 'unavailable';

        const projectId = process.env.OPS_VERCEL_PROJECT_ID;

        const teamId = process.env.OPS_VERCEL_TEAM_ID;

        const now = new Date();

        const from = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
        );

        const url = new URL('https://api.vercel.com/v1/billing/charges');

        url.searchParams.set('from', from.toISOString());
        url.searchParams.set('to', now.toISOString());

        if (teamId) url.searchParams.set('teamId', teamId);

        try {
            const response = await fetchWithTimeout(
                url.toString(),
                { headers: { authorization: `Bearer ${token}` } },
                TIMEOUT_MS
            );

            if (response.status === 404) {
                const body = await response.text();

                // Hobby plans have no charges feed: 404 costs_not_found means nothing was billed.
                if (body.includes('costs_not_found')) {
                    return [{ metric: 'cost_month_usd', value: 0 }];
                }

                return 'unavailable';
            }

            if (!response.ok) return 'unavailable';

            let cost = 0;

            for (const line of (await response.text()).split('\n')) {
                if (!line.trim()) continue;

                const row = JSON.parse(line) as Charge;

                if (projectId && row.Tags?.ProjectId !== projectId) continue;

                cost += Number(row.EffectiveCost) || 0;
            }

            return [{ metric: 'cost_month_usd', value: cost }];
        } catch {
            return 'unavailable';
        }
    },
};
