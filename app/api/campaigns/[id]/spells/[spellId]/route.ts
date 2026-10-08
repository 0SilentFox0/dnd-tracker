import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { updateSpellSchema } from "@/lib/schemas";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

const asJson = (v: unknown) => (v === undefined ? undefined : (v as Prisma.InputJsonValue));

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
    
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spell = await loadOwned(
      prisma.spell.findUnique({
        where: { id: spellId },
        include: {
          spellGroup: true,
        },
      }),
      id,
    );

    if (spell instanceof NextResponse) return spell;

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
    
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spell = await loadOwned(
      prisma.spell.findUnique({
        where: { id: spellId },
      }),
      id,
    );

    if (spell instanceof NextResponse) return spell;

    const data = await parseBody(updateSpellSchema, request);

    if (data instanceof NextResponse) return data;

    const updatedSpell = await prisma.spell.update({
      where: { id: spellId },
      data: {
        name: data.name,
        level: data.level,
        groupId: data.groupId,
        icon: data.icon !== undefined ? data.icon || null : undefined,
        description: data.description,
        appearanceDescription: data.appearanceDescription,
        dice: data.dice,
        cost: data.cost,
        targeting: asJson(data.targeting),
        resolution: asJson(data.resolution),
        spellEffects: asJson(data.spellEffects),
        raceModifiers: asJson(data.raceModifiers),
      },
      include: {
        spellGroup: true,
      },
    });

    invalidateReference(ReferenceKind.SPELLS, id);

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
    
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spell = await loadOwned(
      prisma.spell.findUnique({
        where: { id: spellId },
        select: { campaignId: true },
      }),
      id,
    );

    if (spell instanceof NextResponse) return spell;

    await prisma.spell.deleteMany({
      where: { id: spellId },
    });

    invalidateReference(ReferenceKind.SPELLS, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete spell" });
  }
}
