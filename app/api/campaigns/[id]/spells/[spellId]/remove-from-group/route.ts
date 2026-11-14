import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { runContentOperation } from '@/lib/server/content/operation-service';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';

export const POST = operationRoute(
    CONTENT_OPERATIONS['spells.remove-from-group'],
    async ({ actor, params, body }) =>
        NextResponse.json(
            await runContentOperation('spells.remove-from-group', actor, {
                ...params,
                body,
            })
        )
);
