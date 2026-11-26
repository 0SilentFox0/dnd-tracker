import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { deleteAccountSchema } from '@/lib/schemas/account';
import { deleteAccount } from '@/lib/server/account/delete-account';
import { AccountDeleteBlockedError } from '@/lib/server/account/template-guard';
import { createClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';

export async function DELETE(req: Request) {
    try {
        const auth = await requireAuthUser();

        if (auth instanceof NextResponse) return auth;

        const body = await parseBody(deleteAccountSchema, req);

        if (body instanceof NextResponse) return body;

        if (body.email.toLowerCase() !== auth.authUser.email?.toLowerCase())
            return errorResponse(API_ERRORS.ACCOUNT_EMAIL_MISMATCH, 400);

        await deleteAccount(auth.userId);

        // the auth user is gone, so only a local sign-out can clear the cookies
        await (await createClient()).auth
            .signOut({ scope: 'local' })
            .catch(() => undefined);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof AccountDeleteBlockedError)
            return errorResponse(API_ERRORS.ACCOUNT_DELETE_BLOCKED, 409);

        return handleApiError(error, { action: 'delete account' });
    }
}
