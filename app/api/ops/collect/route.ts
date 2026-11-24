import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { PROVIDER_ADAPTERS } from '@/lib/server/ops/adapters';
import { collectDbGauges } from '@/lib/server/ops/collect-db';
import { evaluateAlerts } from '@/lib/server/ops/evaluate';
import { flushMetrics, gauge } from '@/lib/server/ops/metrics';
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

async function runAdapters(): Promise<Record<string, AdapterStatus>> {
    const results = await Promise.allSettled(
        PROVIDER_ADAPTERS.map((a) =>
            withTimeout(a.collect(), ADAPTER_TIMEOUT_MS)
        )
    );

    const statuses: Record<string, AdapterStatus> = {};

    results.forEach((res, i) => {
        const adapter = PROVIDER_ADAPTERS[i];

        if (res.status === 'rejected') {
            statuses[adapter.name] = 'error';

            return;
        }

        if (res.value === 'unavailable') {
            statuses[adapter.name] = 'unavailable';

            return;
        }

        for (const reading of res.value) {
            gauge(
                `provider.${adapter.name}.${reading.metric}` as Parameters<
                    typeof gauge
                >[0],
                reading.value
            );
        }

        statuses[adapter.name] = 'ok';
    });

    return statuses;
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

        await flushMetrics();

        if (now.getUTCMinutes() === 0) {
            await rollupAndPrune(now).catch((err) =>
                logger.warn('[ops] rollup failed', {}, err)
            );
        }

        const { evaluated, notified } = await evaluateAlerts(now);

        return NextResponse.json({ ok: db, adapters, evaluated, notified });
    } catch (error) {
        return handleApiError(error, { action: 'ops collect' });
    }
}
