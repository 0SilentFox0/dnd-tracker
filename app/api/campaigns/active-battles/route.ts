import { NextResponse } from 'next/server';

import { listActiveSessions } from '@/lib/server/campaigns/active-sessions';
import { requireAuth } from '@/lib/utils/api/api-auth';
import { handleApiError } from '@/lib/utils/api/error-handler';

/**
 * GET /api/campaigns/active-battles
 * Повертає активні бої в кампаніях, де користувач є учасником, та в демо; з ?withShows=1 — ще й активні покази.
 * Використовується для кнопки Join Battle на сторінці кампаній.
 */
export async function GET(request: Request) {
    try {
        const authResult = await requireAuth();

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { userId } = authResult;

        const withShows =
            new URL(request.url).searchParams.get('withShows') === '1';

        return NextResponse.json(await listActiveSessions(userId, withShows));
    } catch (error) {
        return handleApiError(error, { action: 'list active battles' });
    }
}
