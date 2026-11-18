import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { BattleStatus } from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/utils/api/api-response';

type MapUse = { mapId: string | null; mapVersion: number | null };

/**
 * Players may read the library map (at the version a battle pins, or the current one)
 * used by a non-completed battle of the campaign, plus the pinned version of the most
 * recently completed battle so the result screen keeps its walls.
 */
export async function requireMapReadAccess(
    campaignId: string,
    mapId: string,
    isDM: boolean,
    version: number | undefined,
    currentVersion: number
): Promise<NextResponse | null> {
    if (isDM) return null;

    const [live, lastCompleted] = await Promise.all([
        prisma.battleScene.findMany({
            where: {
                campaignId,
                mapId,
                status: { not: BattleStatus.COMPLETED },
            },
            select: { mapId: true, mapVersion: true },
        }),
        prisma.battleScene.findFirst({
            where: { campaignId, status: BattleStatus.COMPLETED },
            orderBy: { completedAt: 'desc' },
            select: { mapId: true, mapVersion: true },
        }),
    ]);

    const uses: MapUse[] = [...live];

    if (lastCompleted?.mapId === mapId) uses.push(lastCompleted);

    const allowed = uses.some(
        (use) =>
            version === undefined ||
            version === currentVersion ||
            use.mapVersion === null ||
            use.mapVersion === version
    );

    return allowed ? null : errorResponse(API_ERRORS.FORBIDDEN, 403);
}
