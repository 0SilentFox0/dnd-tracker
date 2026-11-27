import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { getAdminCampaignSummary } from '@/lib/server/admin/campaign-summary';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    try {
        const { id } = await params;

        const result = await getAdminCampaignSummary(id);

        if (!result) return errorResponse(API_ERRORS.NOT_FOUND, 404);

        return privateJson(result);
    } catch (error) {
        return handleApiError(error, { action: 'load admin campaign summary' });
    }
}
