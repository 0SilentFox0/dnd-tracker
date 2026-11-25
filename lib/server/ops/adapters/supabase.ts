import type { ProviderAdapter } from './types';

import 'server-only';
import { fetchWithTimeout } from '@/lib/server/ops/fetch-with-timeout';

const TIMEOUT_MS = 6000;

type DiskUtil = {
    metrics?: { fs_size_bytes?: number; fs_used_bytes?: number };
};

// Egress and MAU have no public Management API endpoint; DB size comes from the collector itself.
export const supabaseAdapter: ProviderAdapter = {
    name: 'supabase',
    async collect() {
        const token =
            process.env.OPS_SUPABASE_ACCESS_TOKEN ??
            process.env.SUPABASE_API_TOKEN;

        const ref =
            process.env.OPS_SUPABASE_PROJECT_REF ??
            /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(
                process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
            )?.[1];

        if (!token || !ref || !/^[a-z0-9]{10,40}$/.test(ref))
            return 'unavailable';

        try {
            const response = await fetchWithTimeout(
                `https://api.supabase.com/v1/projects/${ref}/config/disk/util`,
                { headers: { authorization: `Bearer ${token}` } },
                TIMEOUT_MS
            );

            if (!response.ok) return 'unavailable';

            const { metrics } = (await response.json()) as DiskUtil;

            if (
                typeof metrics?.fs_used_bytes !== 'number' ||
                typeof metrics.fs_size_bytes !== 'number'
            )
                return 'unavailable';

            return [
                { metric: 'disk_used_bytes', value: metrics.fs_used_bytes },
                { metric: 'disk_size_bytes', value: metrics.fs_size_bytes },
            ];
        } catch {
            return 'unavailable';
        }
    },
};
