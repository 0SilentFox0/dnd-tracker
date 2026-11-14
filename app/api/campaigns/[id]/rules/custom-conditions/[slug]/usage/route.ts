import { NextResponse } from 'next/server';

import { readCustomConditionUsage } from '@/lib/server/campaigns/rules';
import { operationRoute } from '@/lib/server/content/content-routes';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';

export const GET = operationRoute(
    CONTENT_OPERATIONS['rules.condition-usage'],
    async ({ actor, params }) =>
        NextResponse.json(await readCustomConditionUsage(actor, params.slug))
);
