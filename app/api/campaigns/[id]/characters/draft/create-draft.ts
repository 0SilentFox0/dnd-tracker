import { NextResponse } from 'next/server';

import { draftChoiceFields } from './draft-choices';
import { parseDraftBody } from './draft-class';
import { draftFields } from './draft-data';
import { resolveDraftParts } from './draft-resolve';
import { draftRejection } from './draft-rules';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CharacterStatus, CharacterType } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import {
    deriveCharacterDefaults,
    EMPTY_INVENTORY,
} from '@/lib/server/characters/core/derive-character-defaults';
import { lockPlayerDrafts } from '@/lib/server/characters/draft-lock';
import { systemServerOf } from '@/lib/server/systems/registry';
import { requireCampaignAccess } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { heroInitiativeRange } from '@/lib/utils/characters/initiative-range';
import { ruleSystemOf } from '@/lib/utils/rules/systems/registry';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';
import type { CharacterClassEntry } from '@/types/classes';

export async function createDraft(
    request: Request,
    campaignId: string
): Promise<NextResponse> {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    const { campaign } = access;

    const drafts = systemServerOf(campaign.rules).drafts;

    if (drafts) return drafts.create(request, campaign, access);

    if (!statColumnsOf(ruleSystemOf(campaign.rules)).has('classes'))
        return errorResponse(API_ERRORS.SYSTEM_DRAFTS_UNSUPPORTED, 409);

    const parsed = await parseDraftBody(request, campaign);

    if (parsed instanceof NextResponse) return parsed;

    const { data } = parsed;

    const role =
        access.campaign.members.find((m) => m.userId === access.userId)?.role ??
        '';

    const ownDrafts = {
        campaignId,
        controlledBy: access.userId,
        type: CharacterType.PLAYER,
    };

    const reject = (existing: number) =>
        draftRejection({ role, existing, method: data.method, scores: data });

    const early = reject(await prisma.character.count({ where: ownDrafts }));

    if (early) return errorResponse(early, 400);

    const { avatar, asClass } = await resolveDraftParts(parsed, campaign);

    if (!avatar.ok)
        return errorResponse(avatar.message, 400, undefined, avatar.params);

    if (asClass && !asClass.ok)
        return errorResponse(asClass.error, asClass.status);

    const choices = await draftChoiceFields({
        campaignId,
        rules: campaign.rules,
        data,
        classes: asClass?.ok
            ? (asClass.fields.classes as unknown as CharacterClassEntry[])
            : [],
        classesById: parsed.asClass?.classesById,
    });

    if (choices && !choices.ok) return choices.response;

    const spellSlots =
        asClass?.spellSlots ??
        (
            await deriveCharacterDefaults(campaignId, {
                level: 1,
                race: data.race,
            })
        ).spellSlots;

    const result = await prisma.$transaction(async (tx) => {
        await lockPlayerDrafts(tx, campaignId, access.userId);

        const rejection = reject(
            await tx.character.count({ where: ownDrafts })
        );

        if (rejection) return errorResponse(rejection, 400);

        const created = await tx.character.create({
            data: {
                ...draftFields(data, campaign.rules),
                campaignId,
                type: CharacterType.PLAYER,
                status: CharacterStatus.PENDING,
                controlledBy: access.userId,
                level: 1,
                ...asClass?.fields,
                ...(choices?.ok && choices.fields),
                initiative: heroInitiativeRange(campaign.rules).min,
                avatar: avatar.avatar ?? undefined,
                spellSlots,
                skillTreeProgress: {},
            },
        });

        await tx.characterInventory.create({
            data: { characterId: created.id, ...EMPTY_INVENTORY },
        });

        return created;
    });

    return result instanceof NextResponse ? result : NextResponse.json(result);
}
