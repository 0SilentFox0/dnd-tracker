import type { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireCharacterRecord } from "../access";
import { characterRoute, defineCharacterOperation, dmCharacterGate, orThrow } from "../operation-runner";

import { API_ERRORS, characterMaxLevelReachedMessage } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { loadChoiceRefs } from "@/lib/server/characters/choices/load-refs";
import { characterClassMode, resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { classLevelUp, LevelUpBodySchema, type LevelUpPick, readLevelUpPick } from "@/lib/server/characters/class-level-up";
import { loadRaceProgression } from "@/lib/server/characters/core/load-race-progression";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { ContentError } from "@/lib/server/content/errors";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { choicesStateOf, withClassPicks } from "@/lib/utils/characters/choices/picks";
import { hasPicks } from "@/lib/utils/characters/choices/read";
import { applyLevelGain } from "@/lib/utils/characters/level-up/apply-level-gain";
import { seenLevelOnLevelChange } from "@/lib/utils/characters/seen-level";

type Gate = Exclude<Awaited<ReturnType<typeof requireCharacterRecord>>, NextResponse>;

async function levelUpCore({ access, character }: Gate, pick: LevelUpPick) {
  const { campaign } = access;

  const id = character.campaignId;

  const characterId = character.id;

  const classResult = await orThrow(classLevelUp({ campaign, character, pick }));

  if (classResult) {
    const withChoices = hasPicks(pick.choices);

    if (withChoices) await orThrow(rejectIfInActiveBattle(id, [characterId]));

    const refs = withChoices ? await loadChoiceRefs(id, character.race, { classMode: characterClassMode(campaign.rules, classResult.classes) }) : undefined;

    return prisma.$transaction(async (tx) => {
      await lockCharacters(tx, [characterId]);

      const row = await tx.character.findUnique({ where: { id: characterId } });

      if (!row) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

      const fresh = await orThrow(classLevelUp({ campaign, character: row, pick }));

      if (!fresh) throw new ContentError(API_ERRORS.CLASS_REQUIRED, 422);

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

      if (choices && !choices.ok) throw choices.error;

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

      if (choices?.ok) await writeCharacterLog(tx, [{ campaignId: id, characterId, actorUserId: access.userId, kind: CharacterLogKind.CHOICES_EDIT, data: { before, after: choices.state } }]);

      return { ...updated, levelUpDetails: { abilityIncreased: null, classId: pick.classId } };
    });
  }

  const newLevel = character.level + 1;

  if (newLevel > campaign.maxLevel) throw new ContentError(characterMaxLevelReachedMessage(campaign.maxLevel), 422);

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

  return {
    ...updatedCharacter,
    levelUpDetails: {
      abilityIncreased: gain.gained[0] ?? null,
      spellSlots: gain.spellSlots,
    },
  };
}

export const levelUpOperation = defineCharacterOperation({
  name: "level-up",
  action: "level up character",
  schema: LevelUpBodySchema,
  gate: dmCharacterGate((ctx, access) => requireCharacterRecord(ctx.campaignId, ctx.characterId, { access, notFound: API_ERRORS.NOT_FOUND })),
  body: readLevelUpPick,
  run: levelUpCore,
});

export const POST = characterRoute(levelUpOperation);
