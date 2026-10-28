import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { buildCharacterUpdateData, resolveFinalLevel, tableSlots } from "./build-character-update-data";
import { loadRaceProgression } from "./load-race-progression";
import { updateCharacterSchema } from "./update-character-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { applyClasses } from "@/lib/server/characters/apply-classes";
import { lockCharacters } from "@/lib/server/characters/lock";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { keepStoredPicks } from "@/lib/utils/characters/choices/picks";
import { seenLevelOnLevelChange } from "@/lib/utils/characters/seen-level";
import type { SpellSlots } from "@/lib/utils/spells/spell-slots";
import type { SpellSlotProgression } from "@/types/races";

export async function patchCharacter(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const accessResult = await requireCampaignAccess(campaignId, false);

  if (accessResult instanceof NextResponse) return accessResult;

  const { userId, campaign, isDM } = accessResult;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId } }), campaignId);

  if (character instanceof NextResponse) return character;

  const isOwner = character.controlledBy === userId;

  if (!isDM && !(isOwner && campaign.allowPlayerEdit)) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  if (!isDM && character.status === CharacterStatus.PENDING) return errorResponse(API_ERRORS.DRAFT_EDIT_VIA_DRAFT, 403);

  const parsed = await parseBody(updateCharacterSchema, request);

  if (parsed instanceof NextResponse) return parsed;

  if (parsed.initiative !== undefined) {
    const { heroMin, heroMax } = campaign.rules.initiative;

    if (parsed.initiative < heroMin || parsed.initiative > heroMax) return errorResponse(`${API_ERRORS.INITIATIVE_OUT_OF_RANGE} (${heroMin}–${heroMax})`, 400);
  }

  const data = isDM
    ? parsed
    : ({ ...parsed, level: undefined, classes: undefined, archetype: undefined, avatar: undefined, controlledBy: character.controlledBy, type: character.type } as typeof parsed);

  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId, current: character.avatar });

  if (!avatar.ok) return errorResponse(avatar.message, 400);

  const classesInput = data.classes ? keepStoredPicks(data.classes, character.classes) : undefined;

  const applied = classesInput
    ? await applyClasses({
        campaignId,
        rules: campaign.rules,
        maxLevel: campaign.maxLevel,
        entries: classesInput,
        spellcastingAbility: data.spellcastingAbility ?? character.spellcastingAbility,
      })
    : null;

  if (applied && !applied.ok) return errorResponse(applied.error, applied.status);

  const fromClasses = applied?.data ?? null;

  const hadClasses = Array.isArray(character.classes) && character.classes.length > 0;

  const clearingClasses = Boolean(applied) && !fromClasses && hadClasses;

  const bodyData = fromClasses ? { ...data, level: undefined } : data;

  const finalLevel = fromClasses?.level ?? resolveFinalLevel(character, data);

  if (finalLevel > character.level && finalLevel > campaign.maxLevel) {
    return errorResponse(`Максимальний рівень кампанії — ${campaign.maxLevel}`, 422);
  }

  const needsRace = !fromClasses && (finalLevel !== character.level || clearingClasses);

  const race = needsRace ? await loadRaceProgression(campaignId, data.race ?? character.race) : null;

  const computed = buildCharacterUpdateData({ character, data: bodyData, campaign, race });

  const classSeenLevel = fromClasses ? seenLevelOnLevelChange(character.level, finalLevel, character.seenLevel ?? null) : undefined;

  const progression = Array.isArray(race?.spellSlotProgression) ? (race.spellSlotProgression as unknown as SpellSlotProgression[]) : null;

  const restoredSlots = clearingClasses
    ? tableSlots(finalLevel, (data.spellSlots ?? character.spellSlots) as SpellSlots | null, progression, campaign.maxLevel)
    : undefined;

  const classesData = fromClasses && {
    class: fromClasses.class,
    subclass: fromClasses.subclass,
    spellSlots: fromClasses.spellSlots as Prisma.InputJsonValue,
    ...(fromClasses.spellcastingAbility && { spellcastingAbility: fromClasses.spellcastingAbility }),
  };

  const writeUpdate = (db: Pick<Prisma.TransactionClient, "character">, classes: typeof classesInput) =>
    db.character.update({
      where: { id: characterId },
      data: {
        ...data,
        classes: classes as unknown as Prisma.InputJsonValue | undefined,
        avatar: avatar.avatar,
        level: computed.finalLevel,
        ...computed.abilityScores,
        ...(computed.spellSlots && { spellSlots: computed.spellSlots as Prisma.InputJsonValue }),
        ...(restoredSlots && { spellSlots: restoredSlots as Prisma.InputJsonValue }),
        immunities:
          data.immunities !== undefined
            ? (data.immunities as Prisma.InputJsonValue)
            : (character.immunities as Prisma.InputJsonValue | undefined),
        ...classesData,
        ...(computed.skillTreeProgressUpdate !== undefined && { skillTreeProgress: computed.skillTreeProgressUpdate }),
        ...(computed.seenLevel !== undefined && { seenLevel: computed.seenLevel }),
        ...(fromClasses && { level: finalLevel }),
        ...(classSeenLevel !== undefined && { seenLevel: classSeenLevel }),
      },
      include: { user: { select: PUBLIC_USER_SELECT }, inventory: true },
      omit: { notes: true },
    });

  const updatedCharacter = data.classes
    ? await prisma.$transaction(async (tx) => {
        await lockCharacters(tx, [characterId]);

        const fresh = await tx.character.findUnique({ where: { id: characterId }, select: { classes: true } });

        return writeUpdate(tx, keepStoredPicks(data.classes ?? [], fresh?.classes ?? character.classes));
      })
    : await writeUpdate(prisma, classesInput);

  return NextResponse.json(updatedCharacter);
}
