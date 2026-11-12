import type { Prisma } from '@prisma/client';
import type { ZodType } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/utils/api/content-error';

export { ContentError };

export function parseInput<T>(
    schema: ZodType<T>,
    raw: unknown,
    message: string = API_ERRORS.INVALID_BODY
): T {
    const parsed = schema.safeParse(raw);

    if (!parsed.success)
        throw new ContentError(message, 400, parsed.error.issues);

    return parsed.data;
}

export const toJsonInput = (v: unknown) =>
    v === undefined ? undefined : (v as Prisma.InputJsonValue);
