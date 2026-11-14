import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import { applySafeSource } from '@/lib/server/templates/sync/service';

export const POST = operationRoute(
    CONTENT_OPERATIONS['source.apply-safe'],
    async ({ actor }) => NextResponse.json(await applySafeSource(actor))
);
