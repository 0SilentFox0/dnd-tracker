import { NextResponse } from "next/server";

import { getCachedMainSkills } from "@/lib/cache/reference-data";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { createMainSkillSchema } from "@/lib/schemas";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Доступ для будь-якого учасника кампанії (гравці мають бачити персональні скіли при створенні/редагуванні персонажа)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const mainSkills = await getCachedMainSkills(id);

    return NextResponse.json(mainSkills, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list main skills" });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const body = await request.json();

    const data = createMainSkillSchema.parse(body);

    const mainSkill = await prisma.mainSkill.create({
      data: {
        campaignId: id,
        name: data.name,
        color: data.color,
        icon: data.icon || null,
        isEnableInSkillTree: data.isEnableInSkillTree ?? false,
        spellGroupId: data.spellGroupId || null,
      },
    });

    invalidateReference([ReferenceKind.MAIN_SKILLS, ReferenceKind.SKILLS], id);

    return NextResponse.json(mainSkill);
  } catch (error) {
    return handleApiError(error, { action: "create main skill" });
  }
}
