import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { buildCharacterUpdateData, resolveFinalLevel } from "./build-character-update-data";
import { loadRaceProgression } from "./load-race-progression";
import { updateCharacterSchema } from "./update-character-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function patchCharacter(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const accessResult = await requireCampaignAccess(campaignId, false);

  if (accessResult instanceof NextResponse) return accessResult;

  const { userId, campaign, isDM } = accessResult;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId } }), campaignId);

  if (character instanceof NextResponse) return character;

  const isOwner = character.controlledBy === userId;

  const campaignWithAllow = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { allowPlayerEdit: true } });

  const allowPlayerEdit = campaignWithAllow?.allowPlayerEdit ?? false;

  if (!isDM && !(isOwner && allowPlayerEdit)) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const parsed = await parseBody(updateCharacterSchema, request);

  if (parsed instanceof NextResponse) return parsed;

  const data = isDM
    ? parsed
    : ({ ...parsed, level: undefined, archetype: undefined, avatar: undefined, experience: undefined, controlledBy: character.controlledBy, type: character.type } as typeof parsed);

  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId });

  if (!avatar.ok) return errorResponse(avatar.message, 400);

  const xpMultiplier = campaign.xpMultiplier ?? 1;

  const finalLevel = resolveFinalLevel(character, data, xpMultiplier, campaign.maxLevel);

  if (finalLevel > character.level && finalLevel > campaign.maxLevel) {
    return errorResponse(`Максимальний рівень кампанії — ${campaign.maxLevel}`, 422);
  }

  const race = finalLevel !== character.level ? await loadRaceProgression(campaignId, data.race ?? character.race) : null;

  const computed = buildCharacterUpdateData({ character, data, xpMultiplier, campaign, race });

  const updatedCharacter = await prisma.character.update({
    where: { id: characterId },
    data: {
      ...data,
      avatar: avatar.avatar,
      level: computed.finalLevel,
      ...computed.abilityScores,
      ...(computed.spellSlots && { spellSlots: computed.spellSlots as Prisma.InputJsonValue }),
      immunities:
        data.immunities !== undefined
          ? (data.immunities as Prisma.InputJsonValue)
          : (character.immunities as Prisma.InputJsonValue | undefined),
      ...(computed.skillTreeProgressUpdate !== undefined && { skillTreeProgress: computed.skillTreeProgressUpdate }),
      ...(computed.seenLevel !== undefined && { seenLevel: computed.seenLevel }),
    },
    include: { user: true, inventory: true },
  });

  return NextResponse.json(updatedCharacter);
}
