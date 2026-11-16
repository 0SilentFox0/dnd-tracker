import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import {
    ownedBattleMapBackgroundPath,
    removeBattleMapBackgroundFiles,
} from '@/lib/server/battle-maps/background-upload';
import { errorResponse } from '@/lib/utils/api/api-response';
import { withDM } from '@/lib/utils/api/as-dm';
import { parseBody } from '@/lib/utils/api/parse-body';

const schema = z.object({ imageUrl: z.string().url().max(2000) });

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    return withDM(id, 'discard unused battle map background', async () => {
        const body = await parseBody(schema, req);

        if (body instanceof NextResponse) return body;

        if (!ownedBattleMapBackgroundPath(id, body.imageUrl))
            return errorResponse('Invalid battle map background', 400);

        const [usedCurrent, usedByVersion] = await Promise.all([
            prisma.battleMap.findFirst({
                where: {
                    campaignId: id,
                    header: { path: ['background'], equals: body.imageUrl },
                },
                select: { id: true },
            }),
            prisma.battleMapVersion.findFirst({
                where: {
                    map: { campaignId: id },
                    payload: {
                        path: ['header', 'background'],
                        equals: body.imageUrl,
                    },
                },
                select: { mapId: true },
            }),
        ]);

        if (!usedCurrent && !usedByVersion)
            await removeBattleMapBackgroundFiles(id, [body.imageUrl]);

        return NextResponse.json({ ok: true });
    });
}
