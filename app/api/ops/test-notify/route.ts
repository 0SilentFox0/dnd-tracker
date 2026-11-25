import { NextResponse } from 'next/server';

import { sendAlert } from '@/lib/server/ops/notify';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

export const dynamic = 'force-dynamic';

export async function POST() {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    const result = await sendAlert({
        title: '[TEST] ops notifications',
        body: 'Test message from the ops dashboard.',
        severity: 'ok',
    });

    return NextResponse.json(result);
}
