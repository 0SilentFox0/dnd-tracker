import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { deleteSpellsByLevelSchema } from "@/lib/schemas";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function DELETE(
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

    const { level } = deleteSpellsByLevelSchema.parse(body);

    // Видаляємо всі заклинання рівня в кампанії
    const result = await prisma.spell.deleteMany({
      where: {
        campaignId: id,
        level,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    return handleApiError(error, { action: "delete spells by level" });
  }
}
