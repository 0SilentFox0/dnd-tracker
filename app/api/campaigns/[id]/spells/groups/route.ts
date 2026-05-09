import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess,requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

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
    return handleApiError(error, { action: "create spell group" });
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
    return handleApiError(error, { action: "list spell groups" });
  }
}
