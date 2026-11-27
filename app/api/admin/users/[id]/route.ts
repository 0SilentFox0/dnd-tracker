import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { adminDeleteSchema } from '@/lib/schemas/admin';
import { deleteAccount } from '@/lib/server/account/delete-account';
import { AccountDeleteBlockedError } from '@/lib/server/account/template-guard';
import { logAdminAction } from '@/lib/server/admin/admin-actions';
import {
    assertAuthAdminAvailable,
    deleteAuthUser,
} from '@/lib/server/admin/auth-admin';
import { runUserAction } from '@/lib/server/admin/run-user-action';
import { getAdminUserDetail } from '@/lib/server/admin/user-detail';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';
import { apiErrorJson } from '@/lib/utils/api/translate-error';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    try {
        const { id } = await params;

        const result = await getAdminUserDetail(id);

        if (!result) return errorResponse(API_ERRORS.NOT_FOUND, 404);

        return privateJson(result);
    } catch (error) {
        return handleApiError(error, { action: 'load admin user detail' });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return runUserAction(
        { params, action: 'delete', request, schema: adminDeleteSchema },
        async ({ id, email: targetEmail }, { email }, { adminUserId }) => {
            if (email.toLowerCase() !== targetEmail.toLowerCase())
                return errorResponse(API_ERRORS.ACCOUNT_EMAIL_MISMATCH, 400);

            assertAuthAdminAvailable();

            let authRemoved = true;

            try {
                await deleteAccount(
                    id,
                    {
                        removeAuthUser: async (userId) => {
                            try {
                                await deleteAuthUser(userId);
                            } catch {
                                authRemoved = false;
                            }
                        },
                    },
                    { by: 'admin' }
                );
            } catch (error) {
                if (error instanceof AccountDeleteBlockedError)
                    return apiErrorJson(
                        {
                            error: API_ERRORS.ACCOUNT_DELETE_BLOCKED,
                            templateIds: error.templateIds,
                        },
                        { status: 409 }
                    );

                throw error;
            }

            if (!authRemoved) {
                await logAdminAction({
                    adminUserId,
                    action: 'delete',
                    targetUserId: id,
                    meta: { email: targetEmail, authRemoved: false },
                });

                return errorResponse(API_ERRORS.ADMIN_AUTH_UNAVAILABLE, 503);
            }

            return { email: targetEmail };
        }
    );
}
