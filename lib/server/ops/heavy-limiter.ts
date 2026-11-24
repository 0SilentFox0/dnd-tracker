import { NextResponse } from 'next/server';

import 'server-only';
import { capacity } from '@/lib/config/capacity';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { incr } from '@/lib/ops/metrics';
import { apiErrorJson } from '@/lib/utils/api/translate-error';

const RETRY_AFTER_SECONDS = 5;

let running = 0;

function busyResponse(): NextResponse {
    return apiErrorJson(
        { error: API_ERRORS.SERVER_BUSY },
        {
            status: 503,
            headers: { 'Retry-After': String(RETRY_AFTER_SECONDS) },
        }
    );
}

/** Per-instance semaphore for heavy jobs (import, publish, copy): over the profile limit answers 503 + Retry-After. */
export async function withHeavySlot<T>(
    fn: () => Promise<T>
): Promise<T | NextResponse> {
    if (running >= capacity().maxHeavyJobsPerInstance) {
        incr('ratelimit.denied', 1, { scope: 'heavy-busy' });

        return busyResponse();
    }

    running += 1;

    try {
        return await fn();
    } finally {
        running -= 1;
    }
}

export const heavySlotsInUse = () => running;
