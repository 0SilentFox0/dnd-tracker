import { NextResponse } from 'next/server';

import { readDbTop } from '@/lib/server/ops/db-top';
import { privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    try {
        return privateJson(await readDbTop());
    } catch (error) {
        return handleApiError(error, { action: 'read ops slow queries' });
    }
}
