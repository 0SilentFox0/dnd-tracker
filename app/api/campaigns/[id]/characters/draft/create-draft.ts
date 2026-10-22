import { NextResponse } from "next/server";

import { deriveCharacterDefaults, EMPTY_INVENTORY } from "../derive-character-defaults";
import { draftFields } from "./draft-data";
import { draftRejection } from "./draft-rules";
import { draftSchema } from "./draft-schema";

import { CharacterStatus, CharacterType, HERO_INITIATIVE } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { lockPlayerDrafts } from "@/lib/server/characters/draft-lock";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function createDraft(request: Request, campaignId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const data = await parseBody(draftSchema, request);

  if (data instanceof NextResponse) return data;

  const role = access.campaign.members.find((m) => m.userId === access.userId)?.role ?? "";

  const ownDrafts = { campaignId, controlledBy: access.userId, type: CharacterType.PLAYER };

  const reject = (existing: number) => draftRejection({ role, existing, method: data.method, scores: data });

  const early = reject(await prisma.character.count({ where: ownDrafts }));

  if (early) return errorResponse(early, 400);

  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId });

  if (!avatar.ok) return errorResponse(avatar.message, 400);

  const { spellSlots } = await deriveCharacterDefaults(campaignId, { level: 1, race: data.race });

  const result = await prisma.$transaction(async (tx) => {
    await lockPlayerDrafts(tx, campaignId, access.userId);

    const rejection = reject(await tx.character.count({ where: ownDrafts }));

    if (rejection) return errorResponse(rejection, 400);

    const created = await tx.character.create({
      data: {
        ...draftFields(data),
        campaignId,
        type: CharacterType.PLAYER,
        status: CharacterStatus.PENDING,
        controlledBy: access.userId,
        level: 1,
        initiative: HERO_INITIATIVE.DEFAULT,
        avatar: avatar.avatar ?? undefined,
        spellSlots,
        skillTreeProgress: {},
      },
    });

    await tx.characterInventory.create({ data: { characterId: created.id, ...EMPTY_INVENTORY } });

    return created;
  });

  return result instanceof NextResponse ? result : NextResponse.json(result);
}
