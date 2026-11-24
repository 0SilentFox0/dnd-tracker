import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { flushMetrics, gauge } from '@/lib/ops/metrics';
import {
    PROVIDER_ADAPTERS,
    type ProviderAdapter,
} from '@/lib/server/ops/adapters';
import { collectDbGauges } from '@/lib/server/ops/collect-db';
import { evaluateAlerts } from '@/lib/server/ops/evaluate';
import { rollupAndPrune } from '@/lib/server/ops/rollup';
import { errorResponse } from '@/lib/utils/api/api-response';
import { bearerToken } from '@/lib/utils/api/bearer';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { safeEqual } from '@/lib/utils/api/safe-equal';
import { logger } from '@/lib/utils/common/logger';

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

const ADAPTER_TIMEOUT_MS = 8_000;

type AdapterStatus = 'ok' | 'unavailable' | 'error';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function runAdapter(
    adapter: ProviderAdapter
): Promise<[string, AdapterStatus]> {
    try {
        const readings = await withTimeout(
            adapter.collect(),
            ADAPTER_TIMEOUT_MS
        );

        if (readings === 'unavailable') return [adapter.name, 'unavailable'];

        for (const reading of readings) {
            gauge(`provider.${adapter.name}.${reading.metric}`, reading.value);
        }

        return [adapter.name, 'ok'];
    } catch {
        return [adapter.name, 'error'];
    }
}

async function runAdapters(): Promise<Record<string, AdapterStatus>> {
    return Object.fromEntries(
        await Promise.all(PROVIDER_ADAPTERS.map(runAdapter))
    );
}

export async function POST(request: Request) {
    const secret = process.env.OPS_COLLECT_SECRET;

    if (!secret) return errorResponse(API_ERRORS.CRON_NOT_CONFIGURED, 503);

    if (!safeEqual(bearerToken(request) ?? '', secret)) {
        return errorResponse(API_ERRORS.UNAUTHORIZED, 401);
    }

    try {
        const now = new Date();

        const [db, adapters] = await Promise.all([
            collectDbGauges().then(
                () => true,
                (err) => {
                    logger.warn('[ops] db gauges failed', {}, err);

                    return false;
                }
            ),
            runAdapters(),
        ]);

        gauge('collector.heartbeat', Math.floor(now.getTime() / 1000));

        await Promise.all([
            flushMetrics(),
            now.getUTCMinutes() === 0
                ? rollupAndPrune(now).catch((err) =>
                      logger.warn('[ops] rollup failed', {}, err)
                  )
                : undefined,
        ]);

        const { evaluated, notified } = await evaluateAlerts(now);

        return NextResponse.json({ ok: db, adapters, evaluated, notified });
    } catch (error) {
        return handleApiError(error, { action: 'ops collect' });
    }
}
