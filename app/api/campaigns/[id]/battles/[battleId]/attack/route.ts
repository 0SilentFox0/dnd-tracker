import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { processAttack } from "@/lib/utils/battle/battle-attack-process";
import { BattleAction,BattleParticipant } from "@/types/battle";

const attackSchema = z.object({
  attackerId: z.string(), // ID BattleParticipant з initiativeOrder
  targetId: z.string(), // ID BattleParticipant з initiativeOrder
  attackId: z.string().optional(), // ID атаки з attacks масиву (якщо не вказано - перша атака)
  d20Roll: z.number().min(1).max(20).optional(), // результат кидка d20 (опціонально, якщо передається attackRoll)
  attackRoll: z.number().min(1).max(20).optional(), // альтернативна назва для d20Roll (для сумісності)
  advantageRoll: z.number().min(1).max(20).optional(), // другий кидок для Advantage
  damageRolls: z.array(z.number()).default([]), // результати кубиків урону
}).refine((data) => data.d20Roll !== undefined || data.attackRoll !== undefined, {
  message: "d20Roll або attackRoll обов'язковий",
  path: ["d20Roll"],
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

    const data = attackSchema.parse(body);
    
    // Нормалізуємо d20Roll (може бути передано як attackRoll)
    const d20Roll = data.d20Roll ?? data.attackRoll;

    if (!d20Roll) {
      return NextResponse.json(
        { error: "d20Roll is required" },
        { status: 400 }
      );
    }

    // Отримуємо учасників з initiativeOrder
    const initiativeOrder = battle.initiativeOrder as unknown as BattleParticipant[];

    const attacker = initiativeOrder.find((p) => p.basicInfo.id === data.attackerId);

    const target = initiativeOrder.find((p) => p.basicInfo.id === data.targetId);

    if (!attacker || !target) {
      return NextResponse.json(
        { error: "Attacker or target not found in battle" },
        { status: 404 }
      );
    }

    // Перевіряємо чи це поточний хід атакуючого
    const currentParticipant = initiativeOrder[battle.currentTurnIndex];

    if (!currentParticipant || currentParticipant.basicInfo.id !== attacker.basicInfo.id) {
      return NextResponse.json(
        { error: "It is not attacker's turn" },
        { status: 400 }
      );
    }

    // Перевіряємо чи атакуючий може атакувати
    if (attacker.actionFlags.hasUsedAction) {
      return NextResponse.json(
        { error: "Attacker has already used their action" },
        { status: 400 }
      );
    }

    // Перевіряємо чи атакуючий активний
    if (attacker.combatStats.status !== "active") {
      return NextResponse.json(
        { error: "Attacker is not active (unconscious or dead)" },
        { status: 400 }
      );
    }

    // Знаходимо атаку
    let attack = data.attackId
      ? attacker.battleData.attacks.find((a) => a.id === data.attackId || a.name === data.attackId)
      : null;

    if (!attack) {
      // Якщо не вказано ID або не знайдено, використовуємо першу доступну атаку
      attack = attacker.battleData.attacks[0];
    }

    if (!attack) {
      return NextResponse.json(
        { error: "No attack available" },
        { status: 400 }
      );
    }

    // Обробляємо атаку через нову функцію
    const attackResult = processAttack({
      attacker,
      target,
      attack,
      d20Roll: d20Roll,
      advantageRoll: data.advantageRoll,
      damageRolls: data.damageRolls,
      allParticipants: initiativeOrder,
      currentRound: battle.currentRound,
      battleId,
    });

    // Оновлюємо учасників в initiativeOrder
    const updatedInitiativeOrder = initiativeOrder.map((p) => {
      if (p.basicInfo.id === attacker.basicInfo.id) {
        return attackResult.attackerUpdated;
      }

      if (p.basicInfo.id === target.basicInfo.id) {
        return attackResult.targetUpdated;
      }

      return p;
    });

    // Отримуємо поточний battleLog та додаємо нову дію
    const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

    const actionIndex = battleLog.length;

    const battleAction: BattleAction = {
      ...attackResult.battleAction,
      actionIndex,
    };

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        initiativeOrder: updatedInitiativeOrder as unknown as Prisma.InputJsonValue,
        battleLog: [
          ...battleLog,
          battleAction,
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      await pusherServer.trigger(
        `battle-${battleId}`,
        "battle-updated",
        updatedBattle
      );
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error processing attack:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
