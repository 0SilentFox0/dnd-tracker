import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api-auth";

export async function POST(
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

    const updatedSpell = await prisma.spell.update({
      where: { id: spellId },
      data: {
        groupId: null,
      },
      include: {
        spellGroup: true,
      },
    });

    return NextResponse.json(updatedSpell);
  } catch (error) {
    console.error("Error removing spell from group:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
