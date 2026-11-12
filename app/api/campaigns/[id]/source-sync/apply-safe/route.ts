import { NextResponse } from 'next/server';

import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import { applySafeSource } from '@/lib/server/templates/sync/service';
import { operationRoute } from '@/lib/utils/api/content-routes';

export const POST = operationRoute(
    CONTENT_OPERATIONS['source.apply-safe'],
    async ({ actor }) => NextResponse.json(await applySafeSource(actor))
);
