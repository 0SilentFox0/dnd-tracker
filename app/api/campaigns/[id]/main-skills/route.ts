import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCachedMainSkills } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";

const createMainSkillSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1),
  icon: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  isEnableInSkillTree: z.boolean().optional(),
  spellGroupId: z.string().nullable().optional(),
});

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

    return NextResponse.json(mainSkills, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching main skills:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    revalidateTag(`main-skills-${id}`, "max");

    return NextResponse.json(mainSkill);
  } catch (error) {
    console.error("Error creating main skill:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
