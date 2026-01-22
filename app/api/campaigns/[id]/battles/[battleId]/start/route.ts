import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { BattleParticipant } from "@/types/battle";
import { Prisma } from "@prisma/client";
import {
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle-participant";
import {
  applyStartOfBattleEffects,
  calculateInitiative,
  sortByInitiative,
} from "@/lib/utils/battle-start";

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

    const participants = battle.participants as Array<{
      id: string;
      type: "character" | "unit";
      side: "ally" | "enemy";
      quantity?: number;
    }>;

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
          let battleParticipant = await createBattleParticipantFromCharacter(
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

    // Розраховуємо ініціативу з урахуванням спеціальних правил та ефектів
    const initiativeOrderWithCalculatedInitiative = updatedInitiativeOrder.map(
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
