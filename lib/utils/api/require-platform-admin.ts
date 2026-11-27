import type { NextResponse } from 'next/server';

import { getAuthUserOptional } from '@/lib/auth';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { isAdmin } from '@/lib/utils/api/admin-access';
import { errorResponse } from '@/lib/utils/api/api-response';

export async function requirePlatformAdmin(): Promise<
    { userId: string } | NextResponse
> {
    const user = await getAuthUserOptional();

    if (!user || !isAdmin(user)) {
        return errorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    return { userId: user.id };
}
