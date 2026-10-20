import { after, NextResponse } from "next/server";

import { BattleStatus } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { createBattleSchema } from "@/lib/schemas";
import { clearShowBattle } from "@/lib/server/show/show-store";
import { resolveMapBackgroundForPersistence } from "@/lib/supabase/battle-map-storage";
import {
  requireCampaignAccess,
  requireDM,
} from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { battleSceneListSelect } from "@/lib/utils/battle/store/scene-list-select";

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

    const data = await parseBody(createBattleSchema, request);

    if (data instanceof NextResponse) return data;

    let map = data.map;

    if (map) {
      const bg = await resolveMapBackgroundForPersistence(map.background, { campaignId: id });

      if (!bg.ok) return errorResponse(bg.message, 400);

      map = { ...map, background: bg.background ?? null };
    }

    const battle = await prisma.battleScene.create({
      data: {
        campaignId: id,
        name: data.name,
        description: data.description,
        status: BattleStatus.PREPARED,
        participants: data.participants,
        currentRound: 1,
        currentTurnIndex: 0,
        ...(map && { map }),
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

    if (new URL(request.url).searchParams.get("brief") === "1") {
      const briefs = await prisma.battleScene.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true } });

      return NextResponse.json(briefs);
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
        initiativeOrder: [] as unknown[],
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
    const battles = await prisma.battleScene.findMany({ where: { campaignId: id }, select: { id: true } });

    const result = await prisma.battleScene.deleteMany({
      where: {
        campaignId: id,
      },
    });

    after(async () => {
      for (const b of battles) await clearShowBattle(id, b.id);
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count
    });
  } catch (error) {
    return handleApiError(error, { action: "delete all battles" });
  }
}
