import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { adminSecurityQuerySchema } from '@/lib/schemas/admin';
import { buildSecurity } from '@/lib/server/admin/security';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    const parsed = adminSecurityQuerySchema.safeParse({
        days: new URL(request.url).searchParams.get('days') ?? undefined,
    });

    if (!parsed.success) {
        return errorResponse(
            API_ERRORS.INVALID_QUERY,
            400,
            parsed.error.issues
        );
    }

    try {
        return privateJson(await buildSecurity(parsed.data.days));
    } catch (error) {
        return handleApiError(error, { action: 'build admin security' });
    }
}
