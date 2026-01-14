import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { InitiativeParticipant } from "@/lib/types/battle";
import { Prisma } from "@prisma/client";

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
    const initiativeOrder: InitiativeParticipant[] = [];

    for (const participant of participants) {
      if (participant.type === "character") {
        const character = await prisma.character.findUnique({
          where: { id: participant.id },
        });

        if (character) {
          initiativeOrder.push({
            participantId: character.id,
            participantType: "character",
            initiative: character.initiative,
            name: character.name,
            avatar: character.avatar || undefined,
            side: participant.side,
            currentHp: character.currentHp,
            maxHp: character.maxHp,
            tempHp: character.tempHp,
            status: character.currentHp <= 0 ? "dead" : "active",
            activeEffects: [],
          });
        }
      } else if (participant.type === "unit") {
        const unit = await prisma.unit.findUnique({
          where: { id: participant.id },
        });

        if (unit) {
          const quantity = participant.quantity || 1;
          for (let i = 0; i < quantity; i++) {
            initiativeOrder.push({
              participantId: unit.id,
              participantType: "unit",
              instanceId: `${unit.id}-${i}`,
              initiative: unit.initiative,
              name: `${unit.name} #${i + 1}`,
              avatar: unit.avatar || undefined,
              side: participant.side,
              currentHp: unit.maxHp,
              maxHp: unit.maxHp,
              tempHp: 0,
              status: "active",
              activeEffects: [],
            });
          }
        }
      }
    }

    // Сортуємо по initiative (від більшого до меншого)
    initiativeOrder.sort((a, b) => b.initiative - a.initiative);

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        status: "active",
        startedAt: new Date(),
        initiativeOrder: initiativeOrder as unknown as Prisma.InputJsonValue,
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
