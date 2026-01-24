import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess,requireDM } from "@/lib/utils/api/api-auth";

const createSpellGroupSchema = z.object({
  name: z.string().min(1).max(100),
});

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

    const data = createSpellGroupSchema.parse(body);

    const spellGroup = await prisma.spellGroup.create({
      data: {
        campaignId: id,
        name: data.name,
      },
    });

    return NextResponse.json(spellGroup);
  } catch (error) {
    console.error("Error creating spell group:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Перевіряємо доступ до кампанії (не обов'язково DM)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spellGroups = await prisma.spellGroup.findMany({
      where: {
        campaignId: id,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(spellGroups);
  } catch (error) {
    console.error("Error fetching spell groups:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
