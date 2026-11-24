import type { ProviderAdapter } from './types';

import 'server-only';

const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

const TIMEOUT_MS = 6000;

const QUERY = `query($account: String!, $script: String!, $from: Time!, $to: Time!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      workersInvocationsAdaptive(
        limit: 100
        filter: { scriptName: $script, datetime_geq: $from, datetime_leq: $to }
      ) {
        sum { requests errors }
      }
    }
  }
}`;

type Response = {
    data?: {
        viewer?: {
            accounts?: {
                workersInvocationsAdaptive?: {
                    sum?: { requests?: number; errors?: number };
                }[];
            }[];
        };
    };
    errors?: unknown[];
};

export const cloudflareAdapter: ProviderAdapter = {
    name: 'cloudflare',
    async collect() {
        const token = process.env.OPS_CLOUDFLARE_API_TOKEN;

        const account = process.env.OPS_CLOUDFLARE_ACCOUNT_ID;

        const script = process.env.OPS_CLOUDFLARE_WORKER_NAME;

        if (!token || !account || !script) return 'unavailable';

        const now = new Date();

        const dayStart = new Date(now);

        dayStart.setUTCHours(0, 0, 0, 0);

        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: QUERY,
                    variables: {
                        account,
                        script,
                        from: dayStart.toISOString(),
                        to: now.toISOString(),
                    },
                }),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });

            if (!response.ok) return 'unavailable';

            const json = (await response.json()) as Response;

            const rows =
                json.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive;

            if (json.errors?.length || !rows) return 'unavailable';

            const sum = (key: 'requests' | 'errors') =>
                rows.reduce((acc, row) => acc + (row.sum?.[key] ?? 0), 0);

            return [
                { metric: 'requests_day', value: sum('requests') },
                { metric: 'errors_day', value: sum('errors') },
            ];
        } catch {
            return 'unavailable';
        }
    },
};
