import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { BattleStatus } from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/utils/api/api-response';

/** Players may read only the library map that a non-completed battle of the campaign is linked to. */
export async function requireMapReadAccess(
    campaignId: string,
    mapId: string,
    isDM: boolean
): Promise<NextResponse | null> {
    if (isDM) return null;

    const scene = await prisma.battleScene.findFirst({
        where: {
            campaignId,
            mapId,
            status: { not: BattleStatus.COMPLETED },
        },
        select: { id: true },
    });

    return scene ? null : errorResponse(API_ERRORS.FORBIDDEN, 403);
}
