import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCachedSpells } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { createSpellSchema } from "@/lib/schemas";
import { requireCampaignAccess,requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

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

    const data = createSpellSchema.parse(body);

    const spell = await prisma.spell.create({
      data: {
        campaignId: id,
        name: data.name,
        level: data.level,
        type: data.type,
        target: data.target || null,
        damageType: data.damageType,
        damageElement: data.damageElement || null,
        damageModifier: data.damageModifier || null,
        healModifier: data.healModifier || null,
        castingTime: data.castingTime || null,
        range: data.range || null,
        duration: data.duration || null,
        diceCount: data.diceCount || null,
        diceType: data.diceType || null,
        savingThrow: data.savingThrow
          ? (data.savingThrow as unknown as Prisma.InputJsonValue)
          : undefined,
        description: data.description ?? null,
        effects: data.effects ? (data.effects as unknown as Prisma.InputJsonValue) : undefined,
        groupId: data.groupId || null,
        icon: data.icon || null,
        summonUnitId:
          data.summonUnitId && data.summonUnitId.length > 0
            ? data.summonUnitId
            : null,
        damageDistribution:
          data.damageDistribution && data.damageDistribution.length > 0
            ? (data.damageDistribution as unknown as Prisma.InputJsonValue)
            : undefined,
      },
      include: {
        spellGroup: true,
      },
    });

    revalidateTag(`spells-${id}`, "max");

    return NextResponse.json(spell);
  } catch (error) {
    return handleApiError(error, { action: "create spell" });
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

    const spells = await getCachedSpells(id);

    return NextResponse.json(spells, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, { action: "list spells" });
  }
}
