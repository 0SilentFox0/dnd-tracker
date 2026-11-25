import type { NextResponse } from 'next/server';

import { getAuthUserOptional } from '@/lib/auth';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { errorResponse } from '@/lib/utils/api/api-response';
import { isOpsAdmin } from '@/lib/utils/api/ops-access';

export async function requirePlatformAdmin(): Promise<
    { userId: string } | NextResponse
> {
    const user = await getAuthUserOptional();

    if (!user || !isOpsAdmin(user)) {
        return errorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    return { userId: user.id };
}
