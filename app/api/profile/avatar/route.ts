import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { avatarCommitSchema } from '@/lib/schemas/profile';
import { commitUserAvatar, removeUserAvatar } from '@/lib/server/users/avatar';
import { requireAuth } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/utils/api/cache-headers';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';

export async function PUT(req: Request) {
    try {
        const auth = await requireAuth();

        if (auth instanceof NextResponse) return auth;

        const body = await parseBody(avatarCommitSchema, req);

        if (body instanceof NextResponse) return body;

        const r = await commitUserAvatar(auth.userId, body.url);

        if (!r.ok)
            return errorResponse(
                r.message,
                r.message === API_ERRORS.INTERNAL ? 500 : 400
            );

        return NextResponse.json(r.value, { headers: PRIVATE_NO_STORE_HEADERS });
    } catch (error) {
        return handleApiError(error, { action: 'commit avatar' });
    }
}

export async function DELETE() {
    try {
        const auth = await requireAuth();

        if (auth instanceof NextResponse) return auth;

        const r = await removeUserAvatar(auth.userId);

        if (!r.ok) return errorResponse(r.message, 500);

        return NextResponse.json(r.value, { headers: PRIVATE_NO_STORE_HEADERS });
    } catch (error) {
        return handleApiError(error, { action: 'remove avatar' });
    }
}
