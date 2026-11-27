import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { adminOverviewQuerySchema } from '@/lib/schemas/admin';
import { buildOverview } from '@/lib/server/admin/overview';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    const parsed = adminOverviewQuerySchema.safeParse({
        range: new URL(request.url).searchParams.get('range') ?? undefined,
    });

    if (!parsed.success) {
        return errorResponse(
            API_ERRORS.INVALID_QUERY,
            400,
            parsed.error.issues
        );
    }

    try {
        return privateJson(await buildOverview(parsed.data.range));
    } catch (error) {
        return handleApiError(error, { action: 'build admin overview' });
    }
}
