import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import {
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle/battle-participant";
import {
  applyStartOfBattleEffects,
  calculateInitiative,
  sortByInitiative,
} from "@/lib/utils/battle/battle-start";
import {
  executeOnBattleStartEffects,
  executeStartOfRoundTriggers,
} from "@/lib/utils/skills/skill-triggers-execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";

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

    const participantsRaw = battle.participants as Array<{
      id: string;
      type: "character" | "unit";
      side: string;
      quantity?: number;
    }>;

    const participants = participantsRaw.map((p) => ({
      ...p,
      side: (p.side === ParticipantSide.ALLY ? ParticipantSide.ALLY : ParticipantSide.ENEMY) as ParticipantSide,
    }));

    // Створюємо initiativeOrder з усіх учасників
    const initiativeOrder: BattleParticipant[] = [];

    for (const participant of participants) {
      if (participant.type === "character") {
        const character = await prisma.character.findUnique({
          where: { id: participant.id },
          include: {
            inventory: true,
            characterSkills: {
              include: {
                skillTree: true,
              },
            },
          },
        });

        if (character) {
          const battleParticipant = await createBattleParticipantFromCharacter(
            character,
            battleId,
            participant.side
          );

          // Застосовуємо початкові ефекти (після створення всіх учасників)
          initiativeOrder.push(battleParticipant);
        }
      } else if (participant.type === "unit") {
        const unit = await prisma.unit.findUnique({
          where: { id: participant.id },
        });

        if (unit) {
          const quantity = participant.quantity || 1;

          for (let i = 0; i < quantity; i++) {
            const battleParticipant = await createBattleParticipantFromUnit(
              unit,
              battleId,
              participant.side,
              i + 1
            );

            initiativeOrder.push(battleParticipant);
          }
        }
      }
    }

    // Застосовуємо початкові ефекти для всіх учасників (start_of_battle тригери)
    const updatedInitiativeOrder = initiativeOrder.map((participant) => {
      return applyStartOfBattleEffects(participant, 1, initiativeOrder);
    });

    // Скіли з тригером onBattleStart (наприклад +2 ініціатива, бонус на перший удар)
    const onBattleStartMessages: string[] = [];
    const afterOnBattleStart = updatedInitiativeOrder.map((participant) => {
      const result = executeOnBattleStartEffects(participant, 1);
      onBattleStartMessages.push(...result.messages);
      return result.updatedParticipant;
    });

    // Тригери початку раунду (раунд 1) — щоб бонуси ініціативи з startRound скілів потрапили до розрахунку
    const { updatedParticipants: afterStartOfRound, messages: startOfRoundMessages } =
      executeStartOfRoundTriggers(afterOnBattleStart, 1);

    // Збираємо всі повідомлення тригерів для логу бою
    const allTriggerMessages = [
      ...onBattleStartMessages,
      ...startOfRoundMessages,
    ].filter(Boolean);

    // Розраховуємо ініціативу з урахуванням спеціальних правил та ефектів
    const initiativeOrderWithCalculatedInitiative = afterStartOfRound.map(
      (participant) => {
        const calculatedInitiative = calculateInitiative(participant);

        return {
          ...participant,
          abilities: {
            ...participant.abilities,
            initiative: calculatedInitiative,
          },
        };
      }
    );

    // Сортуємо за ініціативою (initiative → baseInitiative → dexterity)
    const sortedInitiativeOrder = sortByInitiative(initiativeOrderWithCalculatedInitiative);

    // Записи логу бою: спрацювання тригерів на початку бою
    const triggerLogEntries: BattleAction[] = [];
    if (allTriggerMessages.length > 0) {
      triggerLogEntries.push({
        id: `triggers-start-${Date.now()}`,
        battleId,
        round: 1,
        actionIndex: 0,
        timestamp: new Date(),
        actorId: "system",
        actorName: "Система",
        actorSide: "ally",
        actionType: "ability",
        targets: [],
        actionDetails: { triggeredAbilities: [] },
        resultText: `Тригери початку бою: ${allTriggerMessages.join("; ")}`,
        hpChanges: [],
        isCancelled: false,
        stateBefore: undefined,
      });
    }

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        status: "active",
        startedAt: new Date(),
        initiativeOrder: sortedInitiativeOrder as unknown as Prisma.InputJsonValue,
        currentRound: 1,
        currentTurnIndex: 0,
        battleLog: triggerLogEntries as unknown as Prisma.InputJsonValue,
      },
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      await pusherServer.trigger(
        `battle-${battleId}`,
        "battle-started",
        updatedBattle
      );
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    console.error("Error starting battle:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
