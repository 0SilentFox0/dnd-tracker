import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  requireCampaignAccess,
  requireDM,
} from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { battleSceneListSelect } from "@/lib/utils/battle/battle-scene-list-select";

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
    return handleApiError(error, { action: "create battle" });
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
      select: battleSceneListSelect,
    });

    return NextResponse.json(
      battles.map((b) => ({
        ...b,
        battleLog: [] as unknown[],
      })),
    );
  } catch (error) {
    return handleApiError(error, { action: "list battles" });
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
    return handleApiError(error, { action: "delete all battles" });
  }
}
