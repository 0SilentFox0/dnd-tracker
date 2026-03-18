import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { buildCharacterUpdateData } from "./build-character-update-data";
import { updateCharacterSchema } from "./update-character-schema";

import { prisma } from "@/lib/db";
import { requireAuth, requireCampaignAccess, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id, characterId } = await params;
    
    // Перевіряємо авторизацію
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        user: true,
        inventory: true,
        campaign: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!character || character.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Перевіряємо права доступу (DM або власник)
    const isDM = character.campaign.members[0]?.role === "dm";

    const isOwner = character.controlledBy === userId;

    if (!isDM && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Нормалізуємо knownSpells до масиву для коректного відображення у формі
    const knownSpells = Array.isArray(character.knownSpells)
      ? character.knownSpells
      : [];

    return NextResponse.json({
      ...character,
      knownSpells,
    });
  } catch (error) {
    console.error("Error fetching character:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id, characterId } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { userId, campaign } = accessResult;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    const validationError = validateCampaignOwnership(character, id);

    if (validationError) {
      return validationError;
    }

    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const isDM = campaign.members[0]?.role === "dm";

    const isOwner = character.controlledBy === userId;

    const campaignWithAllow = await prisma.campaign.findUnique({
      where: { id },
      select: { allowPlayerEdit: true },
    });

    const allowPlayerEdit = campaignWithAllow?.allowPlayerEdit ?? false;

    // Дозволити оновлення: DM завжди, або власник персонажа якщо allowPlayerEdit
    if (!isDM && !(isOwner && allowPlayerEdit)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    let data = updateCharacterSchema.parse(body);

    if (!isDM) {
      data = {
        ...data,
        controlledBy: character.controlledBy,
        type: character.type,
      } as typeof data;
    }

    const computed = buildCharacterUpdateData({
      character,
      data,
      xpMultiplier: campaign.xpMultiplier ?? 1,
    });

    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
      data: {
        ...data,
        level: computed.finalLevel,
        proficiencyBonus: computed.proficiencyBonus,
        passivePerception: computed.passivePerception,
        passiveInvestigation: computed.passiveInvestigation,
        passiveInsight: computed.passiveInsight,
        spellSaveDC: computed.spellSaveDC,
        spellAttackBonus: computed.spellAttackBonus,
        spellSlots: computed.spellSlotsToSave as Prisma.InputJsonValue,
        maxHp: computed.maxHp,
        currentHp: computed.currentHp,
        immunities: data.immunities !== undefined
          ? (data.immunities as Prisma.InputJsonValue)
          : (character.immunities as Prisma.InputJsonValue | undefined),
        ...(computed.skillTreeProgressUpdate !== undefined && {
          skillTreeProgress: computed.skillTreeProgressUpdate,
        }),
      },
      include: {
        user: true,
        inventory: true,
      },
    });

    return NextResponse.json(updatedCharacter);
  } catch (error) {
    console.error("Error updating character:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id, characterId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    const validationError = validateCampaignOwnership(character, id);

    if (validationError) {
      return validationError;
    }

    await prisma.character.delete({
      where: { id: characterId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting character:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
