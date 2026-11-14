import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { runContentOperation } from '@/lib/server/content/operation-service';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';

export const PUT = operationRoute(
    CONTENT_OPERATIONS['tracks.reorder'],
    async ({ actor, params, body }) =>
        NextResponse.json(
            await runContentOperation('tracks.reorder', actor, {
                ...params,
                body,
            })
        )
);
