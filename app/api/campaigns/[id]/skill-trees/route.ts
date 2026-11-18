import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import {
    moduleContentOperation,
    runModuleContentOperation,
} from '@/lib/server/content/module-operations';

export const GET = operationRoute(
    moduleContentOperation('skill-trees.list'),
    async ({ actor }) =>
        NextResponse.json(
            await runModuleContentOperation('skill-trees.list', actor, {})
        )
);
