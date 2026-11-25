import { NextResponse } from 'next/server';

import { operationRoute } from '@/lib/server/content/content-routes';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import { withHeavySlot } from '@/lib/server/ops/heavy-limiter';
import { publishTemplate } from '@/lib/server/templates/publish-service';
import { checkDailyLimit } from '@/lib/utils/api/rate-limit';

export const maxDuration = 120;

export const POST = operationRoute(
    CONTENT_OPERATIONS['template.publish'],
    async ({ actor }) => {
        const daily = await checkDailyLimit(actor.userId, 'templatePublish');

        if (daily) return daily;

        return withHeavySlot(async () =>
            NextResponse.json(await publishTemplate(actor))
        );
    }
);
