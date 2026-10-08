import { NextResponse } from "next/server";

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
import { spellDefinitionColumns } from "@/lib/utils/spells/model/read";

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
        groupId: data.groupId || null,
        icon: data.icon || null,
        description: data.description ?? null,
        appearanceDescription: data.appearanceDescription ?? null,
        // старі колонки NOT NULL до пізнішої міграції; нова модель їх не читає
        type: "target",
        damageType: "damage",
        ...spellDefinitionColumns({ dice: data.dice, cost: data.cost, targeting: data.targeting, resolution: data.resolution, effects: data.spellEffects, raceModifiers: data.raceModifiers, stackable: data.stackable, maxStacks: data.maxStacks ?? undefined }),
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
