import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import { readProgressRow } from '../progress-store';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import type { CampaignAccessResult } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';

export interface ProgressionContext {
    character: {
        id: string;
        level: number;
        race: string;
        skillTreeProgress: unknown;
        seenLevel: number | null;
        controlledBy: string;
    };
    progressVersion: number;
    treeRow: Prisma.SkillTreeGetPayload<object> | null;
    isDM: boolean;
    isOwner: boolean;
}

export async function loadProgressionContext(
    access: CampaignAccessResult,
    campaignId: string,
    characterId: string
): Promise<ProgressionContext | NextResponse> {
    const character = await prisma.character.findFirst({
        where: { id: characterId, campaignId },
        select: {
            id: true,
            level: true,
            race: true,
            seenLevel: true,
            controlledBy: true,
        },
    });

    if (!character) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const isDM = access.isDM;

    const isOwner = character.controlledBy === access.userId;

    if (!isDM && !isOwner) return errorResponse(API_ERRORS.FORBIDDEN, 403);

    const treeRow = await prisma.skillTree.findFirst({
        where: { campaignId, race: character.race },
    });

    const stored = await readProgressRow(character.id);

    return {
        character: {
            ...character,
            skillTreeProgress: stored?.progress ?? {},
        },
        progressVersion: stored?.version ?? 0,
        treeRow,
        isDM,
        isOwner,
    };
}
