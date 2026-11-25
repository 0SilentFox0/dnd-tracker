import { NextResponse } from 'next/server';

import { buildSummary } from '@/lib/server/ops/summary';
import { privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    try {
        return privateJson(await buildSummary());
    } catch (error) {
        return handleApiError(error, { action: 'read ops summary' });
    }
}
