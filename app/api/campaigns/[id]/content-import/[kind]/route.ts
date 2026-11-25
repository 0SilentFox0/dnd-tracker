import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { importContent } from '@/lib/server/content/import/import-content';
import { importKindOf } from '@/lib/server/content/import/kind';
import { translatedImport } from '@/lib/server/content/import/translate-report';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import { withHeavySlot } from '@/lib/server/ops/heavy-limiter';

export const maxDuration = 120;

export const POST = operationRoute(
    CONTENT_OPERATIONS['content.import'],
    async ({ actor, params, body }) => {
        const report = await withHeavySlot(() =>
            importContent(actor, importKindOf(params.kind), body)
        );

        if (report instanceof NextResponse) return report;

        return NextResponse.json(await translatedImport(report));
    }
);
