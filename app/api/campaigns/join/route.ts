import { NextResponse } from 'next/server';

import '@/lib/server/systems/registry';
import { joinCampaignSchema } from '@/lib/schemas';
import { joinCampaignByCode } from '@/lib/server/campaigns/join-campaign';
import { requireAuthUser } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';
import {
    checkRateLimit,
    JOIN_RATE_LIMIT,
    rateLimitResponse,
} from '@/lib/utils/api/rate-limit';

export async function POST(request: Request) {
    try {
        const authResult = await requireAuthUser();

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { userId, authUser } = authResult;

        const rate = await checkRateLimit({
            userId,
            scope: 'campaign-join',
            ...JOIN_RATE_LIMIT,
            memoryFallback: true,
        });

        if (!rate.allowed) return rateLimitResponse(rate);

        const parsedBody = await parseBody(joinCampaignSchema, request);

        if (parsedBody instanceof NextResponse) return parsedBody;

        const { inviteCode } = parsedBody;

        const joined = await joinCampaignByCode(userId, authUser, inviteCode);

        if (!joined.ok) return errorResponse(joined.error, joined.status);

        return NextResponse.json(joined.member);
    } catch (error) {
        return handleApiError(error, { action: 'join campaign' });
    }
}
