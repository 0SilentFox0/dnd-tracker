import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { updateSpellGroupSchema } from "@/lib/schemas";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function PATCH(
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

    const data = await parseBody(updateSpellGroupSchema, request);

    if (data instanceof NextResponse) return data;

    const updatedGroup = await prisma.spellGroup.update({
      where: { id: groupId },
      data: {
        name: data.name,
      },
    });

    invalidateReference(ReferenceKind.SPELLS, id);

    return NextResponse.json(updatedGroup);
  } catch (error) {
    return handleApiError(error, { action: "update spell group" });
  }
}

export async function DELETE(
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
        select: { campaignId: true },
      }),
      id,
    );

    if (spellGroup instanceof NextResponse) return spellGroup;

    // Видаляємо групу (заклинання автоматично втратять зв'язок через onDelete: SetNull в схемі)
    await prisma.spellGroup.deleteMany({
      where: { id: groupId },
    });

    invalidateReference(ReferenceKind.SPELLS, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete spell group" });
  }
}
