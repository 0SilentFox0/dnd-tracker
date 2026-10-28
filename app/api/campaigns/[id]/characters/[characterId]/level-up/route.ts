import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { loadRaceProgression } from "../load-race-progression";

import { prisma } from "@/lib/db";
import { classLevelUp, readLevelUpPick } from "@/lib/server/characters/class-level-up";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { applyLevelGain } from "@/lib/utils/characters/level-up/apply-level-gain";
import { seenLevelOnLevelChange } from "@/lib/utils/characters/seen-level";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id, characterId } = await params;

    const accessResult = await requireDM(id);

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
      const seenLevel = seenLevelOnLevelChange(character.level, classResult.level, character.seenLevel);

      const updated = await prisma.character.update({
        where: { id: characterId },
        data: {
          classes: classResult.classes as unknown as Prisma.InputJsonValue,
          level: classResult.level,
          class: classResult.class,
          subclass: classResult.subclass,
          spellSlots: classResult.spellSlots as Prisma.InputJsonValue,
          ...(classResult.spellcastingAbility && { spellcastingAbility: classResult.spellcastingAbility }),
          ...(seenLevel !== undefined && { seenLevel }),
        },
        include: { user: { select: PUBLIC_USER_SELECT }, inventory: true },
      });

      return NextResponse.json({ ...updated, levelUpDetails: { abilityIncreased: null, classId: pick.classId } });
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
