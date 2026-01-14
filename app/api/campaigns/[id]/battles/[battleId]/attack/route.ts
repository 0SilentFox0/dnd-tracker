import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  isCriticalHit,
  isCriticalMiss,
  isHit,
  rollDamage,
} from "@/lib/utils/calculations";

const attackSchema = z.object({
  attackerId: z.string(),
  attackerType: z.enum(["character", "unit"]),
  targetId: z.string(),
  targetType: z.enum(["character", "unit"]),
  attackRoll: z.number().min(1).max(20),
  damageRolls: z.array(z.number()),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string; battleId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Перевіряємо права DM
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
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
      where: { id: params.battleId },
    });

    if (!battle || battle.campaignId !== params.id) {
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

    // Отримуємо дані атакуючого та цілі
    let attacker: any = null;
    let target: any = null;
    let attackerAC = 10;
    let targetAC = 10;

    if (data.attackerType === "character") {
      attacker = await prisma.character.findUnique({
        where: { id: data.attackerId },
      });
      attackerAC = attacker?.armorClass || 10;
    } else {
      attacker = await prisma.unit.findUnique({
        where: { id: data.attackerId },
      });
      attackerAC = attacker?.armorClass || 10;
    }

    if (data.targetType === "character") {
      target = await prisma.character.findUnique({
        where: { id: data.targetId },
      });
      targetAC = target?.armorClass || 10;
    } else {
      target = await prisma.unit.findUnique({
        where: { id: data.targetId },
      });
      targetAC = target?.armorClass || 10;
    }

    if (!attacker || !target) {
      return NextResponse.json(
        { error: "Attacker or target not found" },
        { status: 404 }
      );
    }

    // Перевіряємо чи попадання успішне
    const criticalHit = isCriticalHit(data.attackRoll);
    const criticalMiss = isCriticalMiss(data.attackRoll);
    const hit = !criticalMiss && (criticalHit || isHit(data.attackRoll, targetAC));

    let damage = 0;
    let result = "";

    if (hit) {
      // Розраховуємо урон
      damage = data.damageRolls.reduce((sum, roll) => sum + roll, 0);
      
      // Додаємо модифікатори (STR для ближньої атаки, DEX для дальньої)
      // TODO: Врахувати тип атаки та модифікатори з артефактів/дерева скілів
      
      if (criticalHit) {
        damage *= 2; // Критичне попадання подвоює урон
        result = `Критичне попадання! ${attacker.name} завдав ${damage} урону ${target.name}`;
      } else {
        result = `${attacker.name} завдав ${damage} урону ${target.name}`;
      }

      // Оновлюємо HP цілі в initiativeOrder
      const initiativeOrder = battle.initiativeOrder as Array<{
        participantId: string;
        participantType: "character" | "unit";
        instanceId?: string;
        currentHp: number;
        tempHp: number;
        status: "active" | "dead" | "unconscious";
      }>;

      const targetInOrder = initiativeOrder.find(
        p => p.participantId === data.targetId && 
        (data.targetType === "character" || p.instanceId === data.targetId)
      );

      if (targetInOrder) {
        // Спочатку віднімаємо з tempHp, потім з currentHp
        let remainingDamage = damage;
        if (targetInOrder.tempHp > 0) {
          const tempDamage = Math.min(targetInOrder.tempHp, remainingDamage);
          targetInOrder.tempHp -= tempDamage;
          remainingDamage -= tempDamage;
        }
        targetInOrder.currentHp = Math.max(0, targetInOrder.currentHp - remainingDamage);
        
        // Оновлюємо статус
        if (targetInOrder.currentHp <= 0) {
          targetInOrder.status = "dead";
        }
      }

      // Оновлюємо бій
      const updatedBattle = await prisma.battleScene.update({
        where: { id: params.battleId },
        data: {
          initiativeOrder,
          battleLog: [
            ...(battle.battleLog as Array<any>),
            {
              round: battle.currentRound,
              timestamp: new Date().toISOString(),
              actorName: attacker.name,
              action: "Attack",
              target: target.name,
              result,
              damage,
            },
          ],
        },
      });

      return NextResponse.json(updatedBattle);
    } else {
      result = `${attacker.name} промахнувся по ${target.name}`;
      
      const updatedBattle = await prisma.battleScene.update({
        where: { id: params.battleId },
        data: {
          battleLog: [
            ...(battle.battleLog as Array<any>),
            {
              round: battle.currentRound,
              timestamp: new Date().toISOString(),
              actorName: attacker.name,
              action: "Attack",
              target: target.name,
              result,
            },
          ],
        },
      });

      // Відправляємо real-time оновлення через Pusher
      if (process.env.PUSHER_APP_ID) {
        const { pusherServer } = await import("@/lib/pusher");
        await pusherServer.trigger(
          `battle-${params.battleId}`,
          "battle-updated",
          updatedBattle
        );
      }

      return NextResponse.json(updatedBattle);
    }
  } catch (error) {
    console.error("Error processing attack:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
