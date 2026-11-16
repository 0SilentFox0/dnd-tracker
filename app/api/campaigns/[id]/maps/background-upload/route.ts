import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
    BATTLE_MAP_BACKGROUND_TYPES,
    MAP_LIMITS,
} from '@/lib/constants/map-limits';
import { createBattleMapBackgroundUploadTicket } from '@/lib/server/battle-maps/background-upload';
import { errorResponse } from '@/lib/utils/api/api-response';
import { withDM } from '@/lib/utils/api/as-dm';
import { parseBody } from '@/lib/utils/api/parse-body';

const requestSchema = z.object({
    size: z.number().int().positive().max(MAP_LIMITS.backgroundUploadBytes),
    contentType: z.enum(BATTLE_MAP_BACKGROUND_TYPES),
});

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    return withDM(id, 'issue battle map background upload', async () => {
        const body = await parseBody(requestSchema, req);

        if (body instanceof NextResponse) return body;

        const ticket = await createBattleMapBackgroundUploadTicket(
            id,
            body.contentType
        );

        return ticket.ok
            ? NextResponse.json(ticket.value)
            : errorResponse(ticket.message, 500);
    });
}
