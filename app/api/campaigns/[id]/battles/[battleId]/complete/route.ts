import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { BattleParticipant, BattleAction } from "@/types/battle";
import { Prisma } from "@prisma/client";
import { completeBattle, checkVictoryConditions } from "@/lib/utils/battle-victory";

const completeBattleSchema = z.object({
  result: z.enum(["victory", "defeat"]).optional(), // Якщо не вказано - автоматична перевірка
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> }
) {
  try {
    const { id, battleId } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    // Перевіряємо права DM
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members[0]?.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      await pusherServer.trigger(
        `battle-${battleId}`,
        "battle-completed",
        updatedBattle
      );
      await pusherServer.trigger(
        `battle-${battleId}`,
        "battle-updated",
        updatedBattle
      );
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
