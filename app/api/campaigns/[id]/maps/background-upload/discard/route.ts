import { NextResponse } from 'next/server';
import { z } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { removeUnreferencedBackgrounds } from '@/lib/server/battle-maps/background-cleanup';
import { ownedBattleMapBackgroundPath } from '@/lib/server/battle-maps/background-upload';
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
            return errorResponse(API_ERRORS.BATTLE_MAP_BACKGROUND_INVALID, 400);

        await removeUnreferencedBackgrounds(id, [body.imageUrl]);

        return NextResponse.json({ ok: true });
    });
}
