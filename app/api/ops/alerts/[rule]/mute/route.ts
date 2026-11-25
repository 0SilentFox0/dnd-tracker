import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { opsMuteSchema } from '@/lib/schemas/ops';
import { muteAlert } from '@/lib/server/ops/alerts';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ rule: string }> }
) {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    const body = await parseBody(opsMuteSchema, request);

    if (body instanceof NextResponse) return body;

    try {
        const result = await muteAlert((await params).rule, body.minutes);

        return result
            ? privateJson(result)
            : errorResponse(API_ERRORS.NOT_FOUND, 404);
    } catch (error) {
        return handleApiError(error, { action: 'mute ops alert' });
    }
}
