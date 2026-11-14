import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import { publishTemplate } from '@/lib/server/templates/publish-service';

export const maxDuration = 120;

export const POST = operationRoute(
    CONTENT_OPERATIONS['template.publish'],
    async ({ actor }) => NextResponse.json(await publishTemplate(actor))
);
