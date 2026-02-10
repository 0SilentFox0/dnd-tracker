import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { processAttack } from "@/lib/utils/battle/battle-attack-process";
import { updateMoraleOnEvent } from "@/lib/utils/skills/skill-triggers-execution";
import { BattleAction, BattleParticipant } from "@/types/battle";

const attackSchema = z
  .object({
    attackerId: z.string(), // ID BattleParticipant з initiativeOrder
    targetId: z.string().optional(), // ID BattleParticipant (для зворотної сумісності)
    targetIds: z.array(z.string()).optional(), // Масив ID BattleParticipants
    attackId: z.string().optional(), // ID атаки з attacks масиву (якщо не вказано - перша атака)
    d20Roll: z.number().min(1).max(20).optional(), // результат кидка d20 (опціонально, якщо передається attackRoll)
    attackRoll: z.number().min(1).max(20).optional(), // альтернативна назва для d20Roll (для сумісності)
    advantageRoll: z.number().min(1).max(20).optional(), // другий кидок для Advantage
    damageRolls: z.array(z.number()).default([]), // результати кубиків урону
  })
  .refine(
    (data) => data.d20Roll !== undefined || data.attackRoll !== undefined,
    {
      message: "d20Roll або attackRoll обов'язковий",
      path: ["d20Roll"],
    },
  )
  .refine(
    (data) =>
      data.targetId !== undefined ||
      (data.targetIds !== undefined && data.targetIds.length > 0),
    {
      message: "Потрібно вказати хоча б одну ціль",
      path: ["targetIds"],
    },
  );

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

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const data = attackSchema.parse(body);

    // Нормалізуємо d20Roll (може бути передано як attackRoll)
    const d20Roll = data.d20Roll ?? data.attackRoll;

    if (!d20Roll) {
      return NextResponse.json(
        { error: "d20Roll is required" },
        { status: 400 },
      );
    }

    // Отримуємо учасників з initiativeOrder
    const initiativeOrder =
      battle.initiativeOrder as unknown as BattleParticipant[];

    const attacker = initiativeOrder.find(
      (p) => p.basicInfo.id === data.attackerId,
    );

    if (!attacker) {
      return NextResponse.json(
        { error: "Attacker not found in battle" },
        { status: 404 },
      );
    }

    // Отримуємо цілі
    const targetIds = data.targetIds || (data.targetId ? [data.targetId] : []);

    const targets = initiativeOrder.filter((p) =>
      targetIds.includes(p.basicInfo.id),
    );

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "No targets found in battle" },
        { status: 404 },
      );
    }

    // Перевіряємо чи це поточний хід атакуючого
    const currentParticipant = initiativeOrder[battle.currentTurnIndex];

    if (
      !currentParticipant ||
      currentParticipant.basicInfo.id !== attacker.basicInfo.id
    ) {
      return NextResponse.json(
        { error: "It is not attacker's turn" },
        { status: 400 },
      );
    }

    // Перевіряємо чи атакуючий може атакувати
    if (attacker.actionFlags.hasUsedAction) {
      return NextResponse.json(
        { error: "Attacker has already used their action" },
        { status: 400 },
      );
    }

    // Перевіряємо чи атакуючий активний
    if (attacker.combatStats.status !== "active") {
      return NextResponse.json(
        { error: "Attacker is not active (unconscious or dead)" },
        { status: 400 },
      );
    }

    // Знаходимо атаку
    let attack = data.attackId
      ? attacker.battleData.attacks.find(
          (a) => a.id === data.attackId || a.name === data.attackId,
        )
      : null;

    if (!attack) {
      // Якщо не вказано ID або не знайдено, використовуємо першу доступну атаку
      attack = attacker.battleData.attacks[0];
    }

    if (!attack) {
      return NextResponse.json(
        { error: "No attack available" },
        { status: 400 },
      );
    }

    // Обмеження кількості цілей (якщо потрібно)
    const maxPossibleTargets =
      attack.maxTargets || attacker.combatStats.maxTargets || 1;

    if (targets.length > maxPossibleTargets) {
      return NextResponse.json(
        {
          error: `Too many targets. Max allowed: ${maxPossibleTargets}`,
        },
        { status: 400 },
      );
    }

    let currentAttacker = { ...attacker };

    let currentInitiativeOrder: BattleParticipant[] = initiativeOrder.map((p) => ({
      ...p,
      battleData: p.battleData
        ? { ...p.battleData, skillUsageCounts: { ...(p.battleData.skillUsageCounts ?? {}) } }
        : p.battleData,
    }));

    const allBattleActions: BattleAction[] = [];

    const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

    const snapshotState = () => ({
      initiativeOrder: JSON.parse(
        JSON.stringify(currentInitiativeOrder),
      ) as BattleParticipant[],
      currentTurnIndex: battle.currentTurnIndex,
      currentRound: battle.currentRound,
    });

    let stateBefore = snapshotState();

    // Обробляємо атаку для кожної цілі
    for (const target of targets) {
      const attackResult = processAttack({
        attacker: currentAttacker,
        target,
        attack,
        d20Roll: d20Roll,
        advantageRoll: data.advantageRoll,
        damageRolls: data.damageRolls,
        allParticipants: currentInitiativeOrder,
        currentRound: battle.currentRound,
        battleId,
      });

      // Оновлюємо атакуючого для наступної ітерації (якщо були зміни)
      currentAttacker = attackResult.attackerUpdated;

      // Оновлюємо initiativeOrder
      currentInitiativeOrder = currentInitiativeOrder.map((p) => {
        if (p.basicInfo.id === currentAttacker.basicInfo.id) {
          return currentAttacker as BattleParticipant;
        }

        if (p.basicInfo.id === target.basicInfo.id) {
          return attackResult.targetUpdated as BattleParticipant;
        }

        return p;
      });

      // Створюємо BattleAction з правильним індексом та stateBefore для rollback
      const battleAction: BattleAction = {
        ...attackResult.battleAction,
        actionIndex: battleLog.length + allBattleActions.length,
        stateBefore: { ...stateBefore },
      };

      allBattleActions.push(battleAction);
      stateBefore = snapshotState();
    }

    // Оновлення моралі: onAllyDeath для кожного загиблого, onKill для атакуючого
    let finalInitiativeOrder = currentInitiativeOrder;
    for (const target of targets) {
      const currentTarget = finalInitiativeOrder.find(
        (p) => p.basicInfo.id === target.basicInfo.id,
      );
      if (
        currentTarget &&
        (currentTarget.combatStats.status === "dead" ||
          currentTarget.combatStats.status === "unconscious")
      ) {
        const allyResult = updateMoraleOnEvent(
          finalInitiativeOrder,
          "allyDeath",
          target.basicInfo.id,
        );
        finalInitiativeOrder = allyResult.updatedParticipants;
      }
    }
    const killResult = updateMoraleOnEvent(
      finalInitiativeOrder,
      "kill",
      currentAttacker.basicInfo.id,
    );
    finalInitiativeOrder = killResult.updatedParticipants;

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        initiativeOrder:
          finalInitiativeOrder as unknown as Prisma.InputJsonValue,
        battleLog: [
          ...battleLog,
          ...allBattleActions,
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      void pusherServer
        .trigger(`battle-${battleId}`, "battle-updated", updatedBattle)
        .catch((err) => console.error("Pusher trigger failed:", err));
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error processing attack:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
