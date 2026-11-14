import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { runContentOperation } from '@/lib/server/content/operation-service';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';

export const DELETE = operationRoute(
    CONTENT_OPERATIONS['spells.delete-by-level'],
    async ({ actor, params, body }) =>
        NextResponse.json(
            await runContentOperation('spells.delete-by-level', actor, {
                ...params,
                body,
            })
        )
);
