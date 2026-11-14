import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { runContentOperation } from '@/lib/server/content/operation-service';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';

export const GET = operationRoute(
    CONTENT_OPERATIONS['abilities.sources'],
    async ({ actor, params, body }) =>
        NextResponse.json(
            await runContentOperation('abilities.sources', actor, {
                ...params,
                body,
            })
        )
);
