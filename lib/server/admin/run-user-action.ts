import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import {
    type AdminActionKind,
    logAdminAction,
} from '@/lib/server/admin/admin-actions';
import { AdminAuthUnavailableError } from '@/lib/server/admin/auth-admin';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';
import { requirePlatformAdmin } from '@/lib/utils/api/require-platform-admin';

type Target = { id: string; email: string };

type Outcome = Record<string, unknown> | NextResponse | void;

export async function runUserAction<B = undefined>(
    opts: {
        params: Promise<{ id: string }>;
        action: AdminActionKind;
        request?: Request;
        schema?: ZodType<B>;
    },
    run: (target: Target, body: B) => Promise<Outcome>
): Promise<NextResponse> {
    const { params, action, request, schema } = opts;

    const auth = await requirePlatformAdmin();

    if (auth instanceof NextResponse) return auth;

    try {
        const { id } = await params;

        if (id === auth.userId)
            return errorResponse(API_ERRORS.ADMIN_SELF_ACTION, 400);

        const target = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true },
        });

        if (!target) return errorResponse(API_ERRORS.NOT_FOUND, 404);

        let body = undefined as B;

        if (schema && request) {
            const parsed = await parseBody(schema, request);

            if (parsed instanceof NextResponse) return parsed;

            body = parsed;
        }

        const meta = await run(target, body);

        if (meta instanceof NextResponse) return meta;

        await logAdminAction({
            adminUserId: auth.userId,
            action,
            targetUserId: id,
            ...(meta ? { meta } : {}),
        });

        return privateJson({ ok: true });
    } catch (error) {
        if (error instanceof AdminAuthUnavailableError)
            return errorResponse(API_ERRORS.ADMIN_AUTH_UNAVAILABLE, 503);

        return handleApiError(error, { action: `admin user ${action}` });
    }
}
