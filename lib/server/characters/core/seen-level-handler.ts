import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import {
    operationAccess,
    withCharacterOperation,
} from '@/lib/server/characters/operation-context';
import type { Actor } from '@/lib/utils/api/actor';
import { errorResponse } from '@/lib/utils/api/api-response';

export async function markLevelSeenUnlocked(
    campaignId: string,
    characterId: string,
    actor?: Actor
): Promise<NextResponse> {
    const access = await operationAccess(campaignId, false, actor);

    if (access instanceof NextResponse) return access;

    const character = await prisma.character.findFirst({
        where: { id: characterId, campaignId },
        select: { id: true, level: true, controlledBy: true },
    });

    if (!character) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    if (character.controlledBy !== access.userId)
        return errorResponse(API_ERRORS.FORBIDDEN, 403);

    await prisma.character.updateMany({
        where: { id: character.id },
        data: { seenLevel: character.level },
    });

    return NextResponse.json({ seenLevel: character.level });
}

export async function markLevelSeen(
    campaignId: string,
    characterId: string,
    actor?: Actor
) {
    const access = await operationAccess(campaignId, false, actor);

    if (access instanceof NextResponse) return access;

    return withCharacterOperation(
        campaignId,
        'progression',
        { characterId },
        () => markLevelSeenUnlocked(campaignId, characterId, actor)
    );
}
