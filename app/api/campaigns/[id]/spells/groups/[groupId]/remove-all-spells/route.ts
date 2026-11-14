import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { runContentOperation } from '@/lib/server/content/operation-service';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';

export const POST = operationRoute(
    CONTENT_OPERATIONS['spell-groups.remove-all-spells'],
    async ({ actor, params, body }) =>
        NextResponse.json(
            await runContentOperation('spell-groups.remove-all-spells', actor, {
                ...params,
                body,
            })
        )
);
