import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCachedUnits } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { createUnitSchema } from "@/lib/schemas";
import { requireCampaignAccess,requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { getProficiencyBonus } from "@/lib/utils/common/calculations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }


    const body = await request.json();

    const data = createUnitSchema.parse(body);

    // Отримуємо колір групи якщо є
    let groupColor: string | null = null;

    if (data.groupId) {
      const group = await prisma.unitGroup.findUnique({
        where: { id: data.groupId },
      });

      groupColor = group?.color || null;
    }

    const proficiencyBonus = data.proficiencyBonus || getProficiencyBonus(data.level);

    const unit = await prisma.unit.create({
      data: {
        campaignId: id,
        name: data.name,
        race: data.race || null,
        groupId: data.groupId,
        groupColor,
        damageModifier: data.damageModifier || null,
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
        proficiencyBonus,
        attacks: data.attacks as Prisma.InputJsonValue,
        specialAbilities: data.specialAbilities as Prisma.InputJsonValue,
        immunities: data.immunities as Prisma.InputJsonValue,
        knownSpells: data.knownSpells,
        morale: data.morale,
        avatar: data.avatar,
      },
      include: {
        unitGroup: true,
      },
    });

    revalidateTag(`units-${id}`, "max");

    return NextResponse.json(unit);
  } catch (error) {
    return handleApiError(error, { action: "create unit" });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Перевіряємо доступ до кампанії (не обов'язково DM)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const units = await getCachedUnits(id);

    return NextResponse.json(units, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, { action: "list units" });
  }
}
