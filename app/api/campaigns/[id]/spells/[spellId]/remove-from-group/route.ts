import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
    
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

    const updatedSpell = await prisma.spell.update({
      where: { id: spellId },
      data: {
        groupId: null,
      },
      include: {
        spellGroup: true,
      },
    });

    invalidateReference(ReferenceKind.SPELLS, id);

    return NextResponse.json(updatedSpell);
  } catch (error) {
    return handleApiError(error, { action: "remove spell from group" });
  }
}
