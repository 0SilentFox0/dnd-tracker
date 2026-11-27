import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { adminUsersQuerySchema } from '@/lib/schemas/admin';
import { listAdminUsers } from '@/lib/server/admin/users-list';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    const parsed = adminUsersQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams)
    );

    if (!parsed.success) {
        return errorResponse(
            API_ERRORS.INVALID_QUERY,
            400,
            parsed.error.issues
        );
    }

    try {
        return privateJson(await listAdminUsers(parsed.data));
    } catch (error) {
        return handleApiError(error, { action: 'list admin users' });
    }
}
