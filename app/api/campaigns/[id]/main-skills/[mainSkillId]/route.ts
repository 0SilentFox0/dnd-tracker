import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { updateMainSkillSchema } from "@/lib/schemas";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; mainSkillId: string }> },
) {
  try {
    const { id, mainSkillId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const mainSkill = await loadOwned(
      prisma.mainSkill.findUnique({
        where: { id: mainSkillId },
      }),
      id,
    );

    if (mainSkill instanceof NextResponse) return mainSkill;

    return NextResponse.json(mainSkill);
  } catch (error) {
    return handleApiError(error, { action: "fetch main skill" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; mainSkillId: string }> },
) {
  try {
    const { id, mainSkillId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const mainSkill = await loadOwned(
      prisma.mainSkill.findUnique({
        where: { id: mainSkillId },
      }),
      id,
    );

    if (mainSkill instanceof NextResponse) return mainSkill;

    const data = await parseBody(updateMainSkillSchema, request);

    if (data instanceof NextResponse) return data;

    const updatedMainSkill = await prisma.mainSkill.update({
      where: { id: mainSkillId },
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon !== undefined ? data.icon : undefined,
        isEnableInSkillTree:
          data.isEnableInSkillTree !== undefined
            ? data.isEnableInSkillTree
            : undefined,
        spellGroupId:
          data.spellGroupId !== undefined
            ? data.spellGroupId || null
            : undefined,
      },
    });

    invalidateReference([ReferenceKind.MAIN_SKILLS, ReferenceKind.SKILLS], id);

    return NextResponse.json(updatedMainSkill);
  } catch (error) {
    return handleApiError(error, { action: "update main skill" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mainSkillId: string }> },
) {
  try {
    const { id, mainSkillId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const mainSkill = await loadOwned(
      prisma.mainSkill.findUnique({
        where: { id: mainSkillId },
        select: { campaignId: true },
      }),
      id,
    );

    if (mainSkill instanceof NextResponse) return mainSkill;

    await prisma.mainSkill.deleteMany({
      where: { id: mainSkillId },
    });

    invalidateReference([ReferenceKind.MAIN_SKILLS, ReferenceKind.SKILLS], id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete main skill" });
  }
}
