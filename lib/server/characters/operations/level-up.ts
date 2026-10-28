import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { guardedCharacterHandler, operationDM } from "../operation-context";

import { loadRaceProgression } from "@/app/api/campaigns/[id]/characters/[characterId]/load-race-progression";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { loadChoiceRefs } from "@/lib/server/characters/choices/load-refs";
import { characterClassMode, resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { classLevelUp, readLevelUpPick } from "@/lib/server/characters/class-level-up";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import type { Actor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { choicesStateOf, withClassPicks } from "@/lib/utils/characters/choices/picks";
import { hasPicks } from "@/lib/utils/characters/choices/read";
import { applyLevelGain } from "@/lib/utils/characters/level-up/apply-level-gain";
import { seenLevelOnLevelChange } from "@/lib/utils/characters/seen-level";

async function POSTImpl(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
, actor?: Actor) {
  try {
    const { id, characterId } = await params;

    const accessResult = await operationDM(id, actor);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { campaign } = accessResult;

    const character = await loadOwned(
      prisma.character.findUnique({
        where: { id: characterId },
      }),
      id,
    );

    if (character instanceof NextResponse) return character;

    const pick = await readLevelUpPick(request);

    if (pick instanceof NextResponse) return pick;

    const classResult = await classLevelUp({ campaign, character, pick });

    if (classResult instanceof NextResponse) return classResult;

    if (classResult) {
      const withChoices = hasPicks(pick.choices);

      if (withChoices) {
        const inBattle = await rejectIfInActiveBattle(id, [characterId]);

        if (inBattle) return inBattle;
      }

      const refs = withChoices ? await loadChoiceRefs(id, character.race, { classMode: characterClassMode(campaign.rules, classResult.classes) }) : undefined;

      return await prisma.$transaction(async (tx) => {
        await lockCharacters(tx, [characterId]);

        const row = await tx.character.findUnique({ where: { id: characterId } });

        if (!row) return errorResponse(API_ERRORS.CHARACTER_NOT_FOUND, 404);

        const fresh = await classLevelUp({ campaign, character: row, pick });

        if (!fresh || fresh instanceof NextResponse) return fresh ?? errorResponse(API_ERRORS.CLASS_REQUIRED, 422);

        const seenLevel = seenLevelOnLevelChange(row.level, fresh.level, row.seenLevel);

        const before = choicesStateOf(row);

        const raised = fresh.classes.find((e) => e.classId === pick.classId);

        const choices = withChoices
          ? await resolveCharacterChoices({
              campaignId: id,
              rules: campaign.rules,
              isDM: true,
              character: { ...row, level: fresh.level },
              before,
              after: { ...before, classes: withClassPicks(fresh.classes, { [pick.classId as string]: { ...(raised?.choices ?? {}), ...pick.choices } }) },
              refs,
            })
          : null;

        if (choices && !choices.ok) return choices.response;

        const updated = await tx.character.update({
          where: { id: characterId },
          data: {
            classes: fresh.classes as unknown as Prisma.InputJsonValue,
            level: fresh.level,
            class: fresh.class,
            subclass: fresh.subclass,
            spellSlots: fresh.spellSlots as Prisma.InputJsonValue,
            ...(fresh.spellcastingAbility && { spellcastingAbility: fresh.spellcastingAbility }),
            ...(seenLevel !== undefined && { seenLevel }),
            ...(choices?.ok && choices.fields),
          },
          include: { user: { select: PUBLIC_USER_SELECT }, inventory: true },
        });

        if (choices?.ok) await writeCharacterLog(tx, [{ campaignId: id, characterId, actorUserId: accessResult.userId, kind: CharacterLogKind.CHOICES_EDIT, data: { before, after: choices.state } }]);

        return NextResponse.json({ ...updated, levelUpDetails: { abilityIncreased: null, classId: pick.classId } });
      });
    }

    const newLevel = character.level + 1;

    if (newLevel > campaign.maxLevel) {
      return NextResponse.json(
        { error: `Персонаж досяг максимального рівня ${campaign.maxLevel}` },
        { status: 422 }
      );
    }

    const race = await loadRaceProgression(id, character.race);

    const gain = applyLevelGain({ character, race, campaign, fromLevel: character.level, toLevel: newLevel });

    const seenLevel = seenLevelOnLevelChange(character.level, newLevel, character.seenLevel);

    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
      data: {
        level: newLevel,
        ...(seenLevel !== undefined && { seenLevel }),
        ...gain.abilityScores,
        spellSlots: gain.spellSlots as Prisma.InputJsonValue,
      },
      include: {
        user: { select: PUBLIC_USER_SELECT },
        inventory: true,
      },
    });

    return NextResponse.json({
      ...updatedCharacter,
      levelUpDetails: {
        abilityIncreased: gain.gained[0] ?? null,
        spellSlots: gain.spellSlots,
      },
    });
  } catch (error) {
    return handleApiError(error, { action: "level up character" });
  }
}

export const POST = guardedCharacterHandler(POSTImpl, "level-up");
