import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api-auth";
import { z } from "zod";

const deleteByLevelSchema = z.object({
  level: z.number().int().min(0).max(9),
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
    console.error("Error deleting spells by level:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
