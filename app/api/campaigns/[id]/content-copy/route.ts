import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CONTENT_KINDS } from '@/lib/constants/content-kinds';
import { runContent } from '@/lib/server/content/content-routes';
import { copyRequestSchema } from '@/lib/server/content/copy/schema';
import { copyContent } from '@/lib/server/content/copy/service';
import { listCopyTargets } from '@/lib/server/content/copy/targets';
import { ContentError } from '@/lib/server/content/errors';
import { loadNames } from '@/lib/server/content/import/names';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/utils/api/cache-headers';
import { NEED } from '@/lib/utils/api/need';
import { parseBody } from '@/lib/utils/api/parse-body';
import type { ImportKind } from '@/types/content-import';

export const maxDuration = 120;

type Ctx = { params: Promise<Record<string, string>> };

export const GET = (req: Request, ctx: Ctx) =>
    runContent(
        {
            req,
            ctx,
            need: NEED.read('dm'),
            action: 'content copy options',
        },
        async (actor) => {
            const kind = new URL(req.url).searchParams.get('kind');

            if (!kind || !(CONTENT_KINDS as readonly string[]).includes(kind))
                throw new ContentError(API_ERRORS.INVALID_QUERY, 400);

            const [items, campaigns] = await Promise.all([
                loadNames(actor.campaignId, kind as ImportKind),
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

            return NextResponse.json(await copyContent({ actor, ...body }));
        }
    );
