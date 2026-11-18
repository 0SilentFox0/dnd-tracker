import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { moduleContentOperation } from '@/lib/server/content/module-operations';
import { runContentOperation } from '@/lib/server/content/operation-service';

export const POST = operationRoute(
    moduleContentOperation('skills.duplicate'),
    async ({ actor, params, body }) =>
        NextResponse.json(
            await runContentOperation('skills.duplicate', actor, {
                ...params,
                body,
            })
        )
);
