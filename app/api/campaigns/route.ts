import { NextResponse } from 'next/server';

import '@/lib/server/systems/registry';
import { campaignListKey } from '@/lib/cache/campaign-list';
import { kvGet, kvSet } from '@/lib/cache/kv';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { createCampaignSchema } from '@/lib/schemas';
import { createCampaignForUser } from '@/lib/server/campaigns/create-campaign';
import { listUserCampaigns } from '@/lib/server/campaigns/read-campaign';
import { bundleErrorResponse } from '@/lib/server/templates/bundle-error';
import { ensureDbUser } from '@/lib/server/users/db-user';
import { requireAuth, requireAuthUser } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/utils/api/cache-headers';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';
import { checkDailyLimit } from '@/lib/utils/api/rate-limit';

export async function POST(request: Request) {
    try {
        const authResult = await requireAuthUser();

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { userId, authUser } = authResult;

        const data = await parseBody(createCampaignSchema, request);

        if (data instanceof NextResponse) return data;

        const daily = await checkDailyLimit(userId, 'campaignCreate');

        if (daily) return daily;

        await ensureDbUser(authUser);

        const created = await createCampaignForUser(userId, data, {
            locale: await getRequestLocale(),
        });

        if (!created.ok) {
            return created.status === 404
                ? errorResponse(API_ERRORS.TEMPLATE_NOT_FOUND, 404)
                : errorResponse(API_ERRORS.TEMPLATE_FORBIDDEN, 403);
        }

        const { campaign, warnings } = created;

        return NextResponse.json(
            warnings.length > 0 ? { ...campaign, warnings } : campaign
        );
    } catch (error) {
        return (
            bundleErrorResponse(error) ??
            handleApiError(error, { action: 'create campaign' })
        );
    }
}

export async function GET() {
    try {
        const authResult = await requireAuth();

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { userId } = authResult;

        const cacheKey = campaignListKey(userId);

        const cached = await kvGet<unknown[]>(cacheKey);

        if (cached) {
            return NextResponse.json(cached, {
                headers: PRIVATE_NO_STORE_HEADERS,
            });
        }

        const campaigns = await listUserCampaigns(userId);

        await kvSet(cacheKey, campaigns);

        return NextResponse.json(campaigns, {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    } catch (error) {
        return handleApiError(error, { action: 'list campaigns' });
    }
}
