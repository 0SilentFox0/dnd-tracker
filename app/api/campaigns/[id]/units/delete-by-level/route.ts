import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { deleteUnitsByLevelSchema } from "@/lib/schemas";
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

    const { level } = deleteUnitsByLevelSchema.parse(body);

    // Видаляємо всі юніти рівня в кампанії
    const result = await prisma.unit.deleteMany({
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
    return handleApiError(error, { action: "delete units by level" });
  }
}
