import { NextResponse } from 'next/server';

import {
    readCampaignRules,
    updateCampaignRules,
} from '@/lib/server/campaigns/rules';
import { operationRoute } from '@/lib/server/content/content-routes';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';

export const GET = operationRoute(
    CONTENT_OPERATIONS['rules.get'],
    async ({ actor }) => NextResponse.json(await readCampaignRules(actor))
);

export const PATCH = operationRoute(
    CONTENT_OPERATIONS['rules.update'],
    async ({ actor, body }) =>
        NextResponse.json(await updateCampaignRules(actor, body))
);
