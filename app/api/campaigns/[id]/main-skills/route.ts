import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api-auth";

const createMainSkillSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1),
  icon: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
});

export async function GET(
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

    const mainSkills = await prisma.mainSkill.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(mainSkills);
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
      },
    });

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
