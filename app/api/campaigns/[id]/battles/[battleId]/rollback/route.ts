import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { BattleAction } from "@/types/battle";

const rollbackSchema = z.object({
  actionIndex: z.number().int().min(0),
});

/**
 * Відміна дії (rollback): видаляє дію з логу та відновлює стан бою з stateBefore цієї дії.
 * Дозволено лише DM. Видаляється дія з індексом actionIndex та всі наступні.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = rollbackSchema.parse(body);

    const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];
    const action = battleLog[data.actionIndex];

    if (!action) {
      return NextResponse.json(
        { error: "Action not found at this index" },
        { status: 404 },
      );
    }

    if (!action.stateBefore) {
      return NextResponse.json(
        { error: "Cannot rollback: action has no saved state" },
        { status: 400 },
      );
    }

    const newBattleLog = battleLog
      .slice(0, data.actionIndex)
      .map((a, i) => ({ ...a, actionIndex: i }));

    const updateData: {
      initiativeOrder: Prisma.InputJsonValue;
      currentTurnIndex: number;
      currentRound: number;
      battleLog: Prisma.InputJsonValue;
      status?: string;
      completedAt?: Date | null;
    } = {
      initiativeOrder:
        action.stateBefore.initiativeOrder as unknown as Prisma.InputJsonValue,
      currentTurnIndex: action.stateBefore.currentTurnIndex,
      currentRound: action.stateBefore.currentRound,
      battleLog: newBattleLog as unknown as Prisma.InputJsonValue,
    };
    if (battle.status === "completed") {
      updateData.status = "active";
      updateData.completedAt = null;
    }

    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: updateData,
    });

    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      await pusherServer.trigger(
        `battle-${battleId}`,
        "battle-updated",
        updatedBattle,
      );
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error rolling back battle action:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
