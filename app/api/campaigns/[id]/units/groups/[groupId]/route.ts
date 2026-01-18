import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api-auth";
import { z } from "zod";

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  damageModifier: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id, groupId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);
    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const group = await prisma.unitGroup.findUnique({
      where: { id: groupId },
    });

    const validationError = validateCampaignOwnership(group, id);
    if (validationError) {
      return validationError;
    }

    const body = await request.json();
    const { name, damageModifier } = updateGroupSchema.parse(body);

    const updatedGroup = await prisma.unitGroup.update({
      where: { id: groupId },
      data: {
        name: name.trim(),
        damageModifier:
          damageModifier !== undefined ? damageModifier : undefined,
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating unit group:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
