import { NextResponse } from 'next/server';

import { createUserAvatarTicket } from '@/lib/server/users/avatar';
import { requireAuth } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/utils/api/cache-headers';
import { handleApiError } from '@/lib/utils/api/error-handler';

export async function POST() {
    try {
        const auth = await requireAuth();

        if (auth instanceof NextResponse) return auth;

        const ticket = await createUserAvatarTicket(auth.userId);

        if (!ticket.ok) return errorResponse(ticket.message, 500);

        return NextResponse.json(ticket.value, {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    } catch (error) {
        return handleApiError(error, { action: 'create avatar ticket' });
    }
}
