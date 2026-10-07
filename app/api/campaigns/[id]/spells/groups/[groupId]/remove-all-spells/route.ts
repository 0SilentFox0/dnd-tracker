import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id, groupId } = await params;
    
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spellGroup = await loadOwned(
      prisma.spellGroup.findUnique({
        where: { id: groupId },
      }),
      id,
    );

    if (spellGroup instanceof NextResponse) return spellGroup;

    // Видаляємо всі заклинання з групи
    await prisma.spell.updateMany({
      where: {
        campaignId: id,
        groupId: groupId,
      },
      data: {
        groupId: null,
      },
    });

    invalidateReference(ReferenceKind.SPELLS, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "remove all spells from group" });
  }
}
