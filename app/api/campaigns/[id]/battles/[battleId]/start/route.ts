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
import { executeOnBattleStartEffects } from "@/lib/utils/skills/skill-triggers-execution";
import { BattleParticipant } from "@/types/battle";

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
    const afterOnBattleStart = updatedInitiativeOrder.map((participant) => {
      const result = executeOnBattleStartEffects(participant, 1);
      return result.updatedParticipant;
    });

    // Розраховуємо ініціативу з урахуванням спеціальних правил та ефектів
    const initiativeOrderWithCalculatedInitiative = afterOnBattleStart.map(
      (participant) => {
        const calculatedInitiative = calculateInitiative(participant);

        return {
          ...participant,
          initiative: calculatedInitiative,
        };
      }
    );

    // Сортуємо за ініціативою (initiative → baseInitiative → dexterity)
    const sortedInitiativeOrder = sortByInitiative(initiativeOrderWithCalculatedInitiative);

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        status: "active",
        startedAt: new Date(),
        initiativeOrder: sortedInitiativeOrder as unknown as Prisma.InputJsonValue,
        currentRound: 1,
        currentTurnIndex: 0,
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
