import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { BattleSpell,processSpell } from "@/lib/utils/battle/battle-spell-process";
import { BattleAction,BattleParticipant } from "@/types/battle";

const spellSchema = z.object({
  casterId: z.string(), // ID BattleParticipant з initiativeOrder
  casterType: z.string().optional(), // опціонально для сумісності
  spellId: z.string(), // ID заклинання з бази даних
  targetIds: z.array(z.string()), // масив ID цілей
  damageRolls: z.array(z.number()).default([]), // результати кубиків урону/лікування
  savingThrows: z
    .array(
      z.object({
        participantId: z.string(),
        roll: z.number().min(1).max(20),
      })
    )
    .optional(), // результати saving throws
  additionalRollResult: z.number().optional(), // результат додаткових кубиків
  hitRoll: z.number().min(1).max(20).optional(), // кидок попадання для заклинань з hitCheck
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

    const data = spellSchema.parse(body);

    // Отримуємо учасників з initiativeOrder
    const initiativeOrder = battle.initiativeOrder as unknown as BattleParticipant[];

    const caster = initiativeOrder.find((p) => p.basicInfo.id === data.casterId);

    if (!caster) {
      return NextResponse.json(
        { error: "Caster not found in battle" },
        { status: 404 }
      );
    }

    // Перевіряємо чи кастер активний
    if (caster.combatStats.status !== "active") {
      return NextResponse.json(
        { error: "Caster is not active (unconscious or dead)" },
        { status: 400 }
      );
    }

    // Перевіряємо чи заклинання є в knownSpells
    if (!caster.spellcasting.knownSpells.includes(data.spellId)) {
      return NextResponse.json(
        { error: "Spell is not in caster's known spells" },
        { status: 400 }
      );
    }

    // Отримуємо заклинання з бази даних
    const spellData = await prisma.spell.findUnique({
      where: { id: data.spellId },
    });

    if (!spellData || spellData.campaignId !== id) {
      return NextResponse.json(
        { error: "Spell not found" },
        { status: 404 }
      );
    }

    // Перевіряємо чи кастер може використати заклинання (action або bonus action)
    const isBonusActionSpell =
      spellData.castingTime?.toLowerCase().includes("bonus") ?? false;
    if (isBonusActionSpell) {
      if (caster.actionFlags.hasUsedBonusAction) {
        return NextResponse.json(
          { error: "Caster has already used their bonus action" },
          { status: 400 }
        );
      }
    } else {
      if (caster.actionFlags.hasUsedAction) {
        return NextResponse.json(
          { error: "Caster has already used their action" },
          { status: 400 }
        );
      }
    }

    // Конвертуємо Spell в BattleSpell
    const battleSpell: BattleSpell = {
      id: spellData.id,
      name: spellData.name,
      level: spellData.level,
      type: spellData.type as "target" | "aoe" | "no_target",
      target: spellData.target as "enemies" | "allies" | "all" | undefined,
      damageType: spellData.damageType as "damage" | "heal" | "all",
      damageElement: spellData.damageElement,
      damageModifier: spellData.damageModifier,
      healModifier: spellData.healModifier,
      diceCount: spellData.diceCount,
      diceType: spellData.diceType,
      savingThrow: spellData.savingThrow as
        | {
            ability: string;
            onSuccess: "half" | "none";
            dc?: number;
          }
        | null,
      hitCheck: spellData.hitCheck as { ability: string; dc: number } | null ?? undefined,
      description: spellData.description ?? "",
      duration: spellData.duration,
      castingTime: spellData.castingTime,
      effectDetails: spellData.effectDetails as BattleSpell["effectDetails"] ?? undefined,
    };

    // Обробляємо заклинання через нову функцію
    const spellResult = processSpell({
      caster,
      spell: battleSpell,
      targetIds: data.targetIds,
      allParticipants: initiativeOrder,
      currentRound: battle.currentRound,
      battleId,
      damageRolls: data.damageRolls,
      savingThrows: data.savingThrows,
      additionalRollResult: data.additionalRollResult,
      hitRoll: data.hitRoll,
    });

    // Оновлюємо учасників в initiativeOrder
    const updatedInitiativeOrder = initiativeOrder.map((p) => {
      if (p.basicInfo.id === caster.basicInfo.id) {
        return spellResult.casterUpdated;
      }

      const updatedTarget = spellResult.targetsUpdated.find((t) => t.basicInfo.id === p.basicInfo.id);

      if (updatedTarget) {
        return updatedTarget;
      }

      return p;
    });

    // Отримуємо поточний battleLog та додаємо нову дію з stateBefore для rollback
    const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

    const actionIndex = battleLog.length;

    const stateBefore = {
      initiativeOrder: JSON.parse(
        JSON.stringify(initiativeOrder),
      ) as BattleParticipant[],
      currentTurnIndex: battle.currentTurnIndex,
      currentRound: battle.currentRound,
    };

    const battleAction: BattleAction = {
      ...spellResult.battleAction,
      actionIndex,
      stateBefore,
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

      void pusherServer
        .trigger(`battle-${battleId}`, "battle-updated", updatedBattle)
        .catch((err) => console.error("Pusher trigger failed:", err));
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error processing spell:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
