import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { loadRaceProgression } from "../load-race-progression";

import { prisma } from "@/lib/db";
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
        user: true,
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
