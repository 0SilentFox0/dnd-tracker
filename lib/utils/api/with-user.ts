import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { requireAuth } from './api-auth';
import { handleApiError } from './error-handler';
import { parseBody } from './parse-body';

export async function withUser(
    action: string,
    run: (userId: string) => Promise<Response>
): Promise<Response> {
    try {
        const auth = await requireAuth();

        if (auth instanceof NextResponse) return auth;

        return await run(auth.userId);
    } catch (error) {
        return handleApiError(error, { action });
    }
}

export const withBody = <T>(
    action: string,
    req: Request,
    schema: z.ZodType<T>,
    run: (userId: string, body: T) => Promise<Response>
) =>
    withUser(action, async (userId) => {
        const body = await parseBody(schema, req);

        return body instanceof NextResponse ? body : run(userId, body);
    });
