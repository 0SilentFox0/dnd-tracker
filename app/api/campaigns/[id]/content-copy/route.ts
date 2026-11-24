import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CONTENT_KINDS } from '@/lib/constants/content-kinds';
import { runContent } from '@/lib/server/content/content-routes';
import { loadCopyNames } from '@/lib/server/content/copy/names';
import { copyRequestSchema } from '@/lib/server/content/copy/schema';
import { copyContent } from '@/lib/server/content/copy/service';
import { listCopyTargets } from '@/lib/server/content/copy/targets';
import { ContentError } from '@/lib/server/content/errors';
import { withHeavySlot } from '@/lib/server/ops/heavy-limiter';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/utils/api/cache-headers';
import { NEED } from '@/lib/utils/api/need';
import { parseBody } from '@/lib/utils/api/parse-body';
import { checkDailyLimit } from '@/lib/utils/api/rate-limit';
import {
    requestTranslator,
    translateErrorBody,
} from '@/lib/utils/api/translate-error';

export const maxDuration = 120;

type Ctx = { params: Promise<Record<string, string>> };

export const GET = (req: Request, ctx: Ctx) =>
    runContent(
        {
            req,
            ctx,
            need: NEED.readSession,
            action: 'content copy options',
        },
        async (actor) => {
            const params = new URL(req.url).searchParams;

            if (params.get('campaignsOnly') === '1')
                return NextResponse.json(
                    {
                        campaigns: await listCopyTargets(
                            actor.userId,
                            actor.campaignId
                        ),
                    },
                    { headers: PRIVATE_NO_STORE_HEADERS }
                );

            const kind = params.get('kind');

            if (
                !kind ||
                (kind !== 'maps' &&
                    !(CONTENT_KINDS as readonly string[]).includes(kind))
            )
                throw new ContentError(API_ERRORS.INVALID_QUERY, 400);

            const [items, campaigns] = await Promise.all([
                loadCopyNames(actor.campaignId, kind),
                listCopyTargets(actor.userId, actor.campaignId),
            ]);

            return NextResponse.json(
                {
                    items: items.map(({ id, name }) => ({ id, name })),
                    campaigns,
                },
                { headers: PRIVATE_NO_STORE_HEADERS }
            );
        }
    );

export const POST = (req: Request, ctx: Ctx) =>
    runContent(
        { req, ctx, need: NEED.writeAll, action: 'content copy' },
        async (actor) => {
            const body = await parseBody(copyRequestSchema, req);

            if (body instanceof NextResponse) return body;

            if (!body.after && !body.dryRun) {
                const daily = await checkDailyLimit(actor.userId, 'contentCopy');

                if (daily) return daily;
            }

            const result = await withHeavySlot(() =>
                copyContent({ actor, ...body })
            );

            if (result instanceof NextResponse) return result;

            // `errors` is a server-only namespace, so per-target keys are translated here
            if (!result.targets.some((target) => target.error))
                return NextResponse.json(result);

            const t = await requestTranslator();

            return NextResponse.json({
                ...(result.next ? { next: result.next } : {}),
                targets: result.targets.map((target) =>
                    target.error
                        ? {
                              ...target,
                              error: translateErrorBody(t, {
                                  error: target.error,
                              }).error,
                          }
                        : target
                ),
            });
        }
    );
