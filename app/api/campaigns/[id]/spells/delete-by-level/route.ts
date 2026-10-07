import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { deleteSpellsByLevelSchema } from "@/lib/schemas";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

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

    const parsedBody = await parseBody(deleteSpellsByLevelSchema, request);

    if (parsedBody instanceof NextResponse) return parsedBody;

    const { level } = parsedBody;

    // Видаляємо всі заклинання рівня в кампанії
    const result = await prisma.spell.deleteMany({
      where: {
        campaignId: id,
        level,
      },
    });

    invalidateReference(ReferenceKind.SPELLS, id);

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    return handleApiError(error, { action: "delete spells by level" });
  }
}
