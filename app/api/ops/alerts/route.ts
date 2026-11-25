import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { opsAlertsQuerySchema } from '@/lib/schemas/ops';
import { readAlerts } from '@/lib/server/ops/alerts';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    const parsed = opsAlertsQuerySchema.safeParse({
        limit: new URL(request.url).searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
        return errorResponse(API_ERRORS.INVALID_BODY, 400, parsed.error.issues);
    }

    try {
        return privateJson(await readAlerts(parsed.data.limit));
    } catch (error) {
        return handleApiError(error, { action: 'read ops alerts' });
    }
}
