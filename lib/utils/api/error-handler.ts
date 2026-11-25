import type { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { incr } from '@/lib/ops/metrics';
import { errorResponse } from '@/lib/utils/api/api-response';
import { ContentError } from '@/lib/utils/api/content-error';
import { logger } from '@/lib/utils/common/logger';
import { classifyServerError } from '@/lib/utils/ops/classify-server-error';
import { RulesSystemError } from '@/lib/utils/rules/schema';

export interface ApiErrorContext {
    action: string;
    [key: string]: unknown;
}

/** Details go to the log only; the response carries a generic message. */
export function handleApiError(
    error: unknown,
    context: ApiErrorContext
): NextResponse {
    if (error instanceof ContentError)
        return errorResponse(
            error.message,
            error.status,
            error.issues,
            error.params
        );

    if (error instanceof RulesSystemError)
        return errorResponse(error.messageKey, 422);

    logger.error(`[api] ${context.action} failed`, context, error);

    if (error instanceof z.ZodError) {
        return errorResponse(API_ERRORS.INVALID_BODY, 400, error.issues);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025')
            return errorResponse(API_ERRORS.NOT_FOUND, 404);

        if (error.code === 'P2003')
            return errorResponse(API_ERRORS.FOREIGN_KEY, 400);
    }

    countServerError(error);

    return errorResponse(API_ERRORS.INTERNAL, 500);
}

function countServerError(error: unknown): void {
    const { kind, code } = classifyServerError(error);

    if (code === 'pool_timeout') incr('db.pool_timeout');
    else if (code === 'unreachable') incr('db.unreachable');

    incr('api.error5xx', 1, { kind });
}
