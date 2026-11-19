import { NextResponse } from 'next/server';

import { USER_AVATAR_RATE } from '@/lib/constants/profile';
import { avatarTicketSchema } from '@/lib/schemas/profile';
import { createUserAvatarTicket } from '@/lib/server/users/avatar';
import { requireAuth } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/utils/api/cache-headers';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';
import { checkRateLimit, rateLimitResponse } from '@/lib/utils/api/rate-limit';

export async function POST(req: Request) {
    try {
        const auth = await requireAuth();

        if (auth instanceof NextResponse) return auth;

        const rate = await checkRateLimit({
            userId: auth.userId,
            scope: 'user-avatar-upload',
            ...USER_AVATAR_RATE,
            memoryFallback: true,
        });

        if (!rate.allowed) return rateLimitResponse(rate);

        const body = await parseBody(avatarTicketSchema, req);

        if (body instanceof NextResponse) return body;

        const ticket = await createUserAvatarTicket(
            auth.userId,
            body.contentType
        );

        if (!ticket.ok) return errorResponse(ticket.message, 500);

        return NextResponse.json(ticket.value, {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    } catch (error) {
        return handleApiError(error, { action: 'create avatar ticket' });
    }
}
