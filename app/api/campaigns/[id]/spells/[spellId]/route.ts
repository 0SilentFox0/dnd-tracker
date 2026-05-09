import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { updateSpellSchema } from "@/lib/schemas";
import { requireCampaignAccess, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
    
    // Перевіряємо доступ до кампанії (не обов'язково DM)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
      include: {
        spellGroup: true,
      },
    });

    const validationError = validateCampaignOwnership(spell, id);

    if (validationError) {
      return validationError;
    }

    return NextResponse.json(spell);
  } catch (error) {
    return handleApiError(error, { action: "fetch spell" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
    });

    const validationError = validateCampaignOwnership(spell, id);

    if (validationError) {
      return validationError;
    }

    const body = await request.json();

    const data = updateSpellSchema.parse(body);

    const updatedSpell = await prisma.spell.update({
      where: { id: spellId },
      data: {
        name: data.name,
        level: data.level,
        type: data.type,
        target: data.target !== undefined ? data.target : undefined,
        damageType: data.damageType,
        damageElement: data.damageElement !== undefined ? data.damageElement : undefined,
        damageModifier: data.damageModifier !== undefined ? data.damageModifier : undefined,
        healModifier: data.healModifier !== undefined ? data.healModifier : undefined,
        castingTime: data.castingTime !== undefined ? data.castingTime : undefined,
        range: data.range !== undefined ? data.range : undefined,
        duration: data.duration !== undefined ? data.duration : undefined,
        diceCount: data.diceCount !== undefined ? data.diceCount : undefined,
        diceType: data.diceType !== undefined ? data.diceType : undefined,
        savingThrow:
          data.savingThrow === null
            ? Prisma.JsonNull
            : data.savingThrow
            ? (data.savingThrow as unknown as Prisma.InputJsonValue)
            : undefined,
        hitCheck:
          data.hitCheck !== undefined
            ? data.hitCheck === null
              ? Prisma.JsonNull
              : (data.hitCheck as unknown as Prisma.InputJsonValue)
            : undefined,
        description: data.description !== undefined ? data.description : undefined,
        effects: data.effects !== undefined ? (data.effects as unknown as Prisma.InputJsonValue) : undefined,
        groupId: data.groupId !== undefined ? data.groupId : undefined,
        icon: data.icon !== undefined ? (data.icon || null) : undefined,
        appearanceDescription: data.appearanceDescription !== undefined ? data.appearanceDescription : undefined,
        summonUnitId:
          data.summonUnitId !== undefined
            ? data.summonUnitId === null || data.summonUnitId === ""
              ? null
              : data.summonUnitId
            : undefined,
      },
      include: {
        spellGroup: true,
      },
    });

    revalidateTag(`spells-${id}`, "max");

    return NextResponse.json(updatedSpell);
  } catch (error) {
    return handleApiError(error, { action: "update spell" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
    });

    const validationError = validateCampaignOwnership(spell, id);

    if (validationError) {
      return validationError;
    }

    await prisma.spell.delete({
      where: { id: spellId },
    });

    revalidateTag(`spells-${id}`, "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete spell" });
  }
}
