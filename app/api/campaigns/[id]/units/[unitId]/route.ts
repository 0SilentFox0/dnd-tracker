import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { updateUnitSchema } from "@/lib/schemas";
import { requireCampaignAccess, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;
    
    // Перевіряємо доступ до кампанії (не обов'язково DM)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        unitGroup: true,
      },
    });

    const validationError = validateCampaignOwnership(unit, id);

    if (validationError) {
      return validationError;
    }

    return NextResponse.json(unit);
  } catch (error) {
    return handleApiError(error, { action: "fetch unit" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    const validationError = validateCampaignOwnership(unit, id);

    if (validationError) {
      return validationError;
    }

    await prisma.unit.delete({
      where: { id: unitId },
    });

    revalidateTag(`units-${id}`, "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete unit" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    const validationError = validateCampaignOwnership(unit, id);

    if (validationError) {
      return validationError;
    }

    const body = await request.json();

    const data = updateUnitSchema.parse(body);

    // Отримуємо колір групи якщо змінюється groupId
    let groupColor: string | null = null;

    if (data.groupId !== undefined) {
      if (data.groupId) {
        const group = await prisma.unitGroup.findUnique({
          where: { id: data.groupId },
        });

        groupColor = group?.color || null;
      } else {
        groupColor = null;
      }
    }

    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: {
        name: data.name,
        race: data.race !== undefined ? data.race : undefined,
        groupId: data.groupId !== undefined ? data.groupId : undefined,
        groupColor: data.groupId !== undefined ? groupColor : undefined,
        damageModifier:
          data.damageModifier !== undefined ? data.damageModifier : undefined,
        level: data.level,
        strength: data.strength,
        dexterity: data.dexterity,
        constitution: data.constitution,
        intelligence: data.intelligence,
        wisdom: data.wisdom,
        charisma: data.charisma,
        armorClass: data.armorClass,
        initiative: data.initiative,
        speed: data.speed,
        maxHp: data.maxHp,
        proficiencyBonus: data.proficiencyBonus,
        attacks:
          data.attacks !== undefined
            ? (data.attacks as Prisma.InputJsonValue)
            : undefined,
        specialAbilities:
          data.specialAbilities !== undefined
            ? (data.specialAbilities as Prisma.InputJsonValue)
            : undefined,
        immunities:
          data.immunities !== undefined
            ? (data.immunities as Prisma.InputJsonValue)
            : undefined,
        knownSpells:
          data.knownSpells !== undefined
            ? (data.knownSpells as Prisma.InputJsonValue)
            : undefined,
        minTargets: data.minTargets !== undefined ? data.minTargets : undefined,
        maxTargets: data.maxTargets !== undefined ? data.maxTargets : undefined,
        avatar: data.avatar !== undefined ? (data.avatar || null) : undefined,
      },
      include: {
        unitGroup: true,
      },
    });

    revalidateTag(`units-${id}`, "max");

    return NextResponse.json(updatedUnit);
  } catch (error) {
    return handleApiError(error, { action: "update unit" });
  }
}
