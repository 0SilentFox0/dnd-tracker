import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { checkVictoryConditions,completeBattle } from "@/lib/utils/battle/battle-victory";
import { BattleAction,BattleParticipant } from "@/types/battle";

const completeBattleSchema = z.object({
  result: z.enum(["victory", "defeat"]).optional(), // Якщо не вказано - автоматична перевірка
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> }
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

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data = completeBattleSchema.parse(body);

    const initiativeOrder = battle.initiativeOrder as unknown as BattleParticipant[];

    // Визначаємо результат бою
    let result: "victory" | "defeat";

    if (data.result) {
      // Якщо результат вказано вручну
      result = data.result;
    } else {
      // Автоматична перевірка умов перемоги
      const victoryCheck = checkVictoryConditions(initiativeOrder);

      if (victoryCheck.result) {
        result = victoryCheck.result;
      } else {
        // Якщо умови не виконані, але DM хоче завершити - за замовчуванням перемога
        result = "victory";
      }
    }

    // Завершуємо бій
    const { updatedParticipants, battleAction } = completeBattle(
      initiativeOrder,
      result,
      battle.currentRound
    );

    // Отримуємо поточний battleLog та додаємо нову дію
    const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

    const actionIndex = battleLog.length;

    const finalBattleAction: BattleAction = {
      ...battleAction,
      battleId,
      actionIndex,
      stateBefore: {
        initiativeOrder: JSON.parse(
          JSON.stringify(initiativeOrder),
        ) as BattleParticipant[],
        currentTurnIndex: battle.currentTurnIndex,
        currentRound: battle.currentRound,
      },
    };

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        status: "completed",
        completedAt: new Date(),
        initiativeOrder: updatedParticipants as unknown as Prisma.InputJsonValue,
        battleLog: [
          ...battleLog,
          finalBattleAction,
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      void pusherServer
        .trigger(`battle-${battleId}`, "battle-completed", updatedBattle)
        .catch((err) => console.error("Pusher trigger failed:", err));
      void pusherServer
        .trigger(`battle-${battleId}`, "battle-updated", updatedBattle)
        .catch((err) => console.error("Pusher trigger failed:", err));
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error completing battle:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
