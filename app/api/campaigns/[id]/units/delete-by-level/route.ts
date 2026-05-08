import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

const deleteByLevelSchema = z.object({
  level: z.number().int().min(1).max(30),
});

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

    const { level } = deleteByLevelSchema.parse(body);

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
