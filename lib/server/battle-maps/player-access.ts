import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { BattleStatus } from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/utils/api/api-response';

type MapUse = { mapId: string | null; mapVersion: number | null };

/**
 * Players may read the library map at the version a non-completed battle of the campaign
 * pins (the current one when the pin is null), plus the pinned version of the most
 * recently completed battle so the result screen keeps its walls. Without an explicit
 * version a player gets the pinned one, the DM gets undefined (the caller serves current).
 */
export async function resolveMapReadVersion(
    campaignId: string,
    mapId: string,
    isDM: boolean,
    version: number | undefined,
    currentVersion: number
): Promise<{ version: number | undefined } | NextResponse> {
    if (isDM) return { version };

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
            orderBy: { completedAt: { sort: 'desc', nulls: 'last' } },
            select: { mapId: true, mapVersion: true },
        }),
    ]);

    const uses: MapUse[] = [...live];

    if (lastCompleted?.mapId === mapId) uses.push(lastCompleted);

    const versions = uses.map((use) => use.mapVersion ?? currentVersion);

    const resolved = version ?? versions[0];

    if (resolved === undefined || !versions.includes(resolved))
        return errorResponse(API_ERRORS.FORBIDDEN, 403);

    return { version: resolved };
}
