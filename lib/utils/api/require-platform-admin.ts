import type { NextResponse } from 'next/server';

import { getSessionUserId } from '@/lib/auth';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { errorResponse } from '@/lib/utils/api/api-response';
import { isPlatformAdmin } from '@/lib/utils/api/platform-admin';

export async function requirePlatformAdmin(): Promise<
    { userId: string } | NextResponse
> {
    const userId = await getSessionUserId();

    if (!userId || !isPlatformAdmin(userId)) {
        return errorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    return { userId };
}
