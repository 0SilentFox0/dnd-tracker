import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  requireCampaignAccess,
  requireDM,
} from "@/lib/utils/api/api-auth";

const createBattleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  participants: z.array(z.object({
    id: z.string(),
    type: z.enum(["character", "unit"]),
    side: z.enum(["ally", "enemy"]),
    quantity: z.number().min(1).optional(),
  })),
});

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

    const data = createBattleSchema.parse(body);

    // Створюємо сцену бою
    const battle = await prisma.battleScene.create({
      data: {
        campaignId: id,
        name: data.name,
        description: data.description,
        status: "prepared",
        participants: data.participants,
        currentRound: 1,
        currentTurnIndex: 0,
        initiativeOrder: [],
        battleLog: [],
      },
    });

    return NextResponse.json(battle);
  } catch (error) {
    console.error("Error creating battle:", error);

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

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battles = await prisma.battleScene.findMany({
      where: {
        campaignId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(battles);
  } catch (error) {
    console.error("Error fetching battles:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    // Видаляємо всі битви кампанії
    const result = await prisma.battleScene.deleteMany({
      where: {
        campaignId: id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count 
    });
  } catch (error) {
    console.error("Error deleting all battles:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
