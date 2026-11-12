import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { paletteSchema } from '@/lib/schemas/theme';
import { getUserPalette, saveUserPalette } from '@/lib/server/users/palette';
import { requireAuth } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/utils/api/cache-headers';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';

export async function GET() {
    try {
        const auth = await requireAuth();

        if (auth instanceof NextResponse) return auth;

        return NextResponse.json(
            { userId: auth.userId, palette: await getUserPalette(auth.userId) },
            { headers: PRIVATE_NO_STORE_HEADERS }
        );
    } catch (error) {
        return handleApiError(error, { action: 'read palette' });
    }
}

export async function PUT(req: Request) {
    try {
        const auth = await requireAuth();

        if (auth instanceof NextResponse) return auth;

        const body = await parseBody(paletteSchema, req);

        if (body instanceof NextResponse) return body;

        if (!(await saveUserPalette(auth.userId, body.palette)))
            return errorResponse(API_ERRORS.NOT_FOUND, 404);

        return NextResponse.json(
            { userId: auth.userId, palette: body.palette },
            { headers: PRIVATE_NO_STORE_HEADERS }
        );
    } catch (error) {
        return handleApiError(error, { action: 'save palette' });
    }
}
