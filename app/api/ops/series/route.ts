import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { opsSeriesQuerySchema } from '@/lib/schemas/ops';
import { readSeries } from '@/lib/server/ops/read-series';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';
import { parseSeriesKey, type SeriesSpec } from '@/lib/utils/ops/series';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    const params = new URL(request.url).searchParams;

    const parsed = opsSeriesQuerySchema.safeParse({
        range: params.get('range'),
        metrics: params.get('metrics') ?? '',
    });

    if (!parsed.success) {
        return errorResponse(API_ERRORS.INVALID_BODY, 400, parsed.error.issues);
    }

    const specs = parsed.data.metrics.map(
        (key) => parseSeriesKey(key) as SeriesSpec
    );

    try {
        return privateJson(await readSeries(specs, parsed.data.range));
    } catch (error) {
        return handleApiError(error, { action: 'read ops series' });
    }
}
