import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { sourceSyncQuerySchema } from '@/lib/schemas';
import { operationRoute } from '@/lib/server/content/content-routes';
import { parseInput } from '@/lib/server/content/errors';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import {
    applySource,
    getSourceDiff,
} from '@/lib/server/templates/sync/service';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/utils/api/cache-headers';

export const GET = operationRoute(
    CONTENT_OPERATIONS['source.diff'],
    async ({ actor, req }) => {
        const { scope } = parseInput(
            sourceSyncQuerySchema,
            { scope: new URL(req.url).searchParams.get('scope') ?? undefined },
            API_ERRORS.INVALID_QUERY
        );

        return NextResponse.json(await getSourceDiff(actor, scope), {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    }
);

export const POST = operationRoute(
    CONTENT_OPERATIONS['source.apply'],
    async ({ actor, body }) => NextResponse.json(await applySource(actor, body))
);
