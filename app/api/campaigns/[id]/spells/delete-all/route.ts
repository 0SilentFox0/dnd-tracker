import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    // Видаляємо всі заклинання кампанії
    const result = await prisma.spell.deleteMany({
      where: {
        campaignId: id,
      },
    });

    invalidateReference(ReferenceKind.SPELLS, id);

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    return handleApiError(error, { action: "delete all spells" });
  }
}
