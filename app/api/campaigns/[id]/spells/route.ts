import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { listSpellsQuerySchema } from "./list-spells-query";

import { getCachedSpells } from "@/lib/cache/reference-data";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { createSpellSchema } from "@/lib/schemas";
import { requireCampaignAccess,requireDM } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { loadBookSpellsByIds } from "@/lib/utils/spells/book-spells-by-ids";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const data = await parseBody(createSpellSchema, request);

    if (data instanceof NextResponse) return data;

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

    invalidateReference(ReferenceKind.SPELLS, id);

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
    
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { ids } = listSpellsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

    if (ids) return NextResponse.json(await loadBookSpellsByIds(id, ids), { headers: PRIVATE_NO_STORE_HEADERS });

    const spells = await getCachedSpells(id);

    return NextResponse.json(spells, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list spells" });
  }
}
