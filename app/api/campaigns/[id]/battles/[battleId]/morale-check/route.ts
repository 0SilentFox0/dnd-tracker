import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { checkMorale } from "@/lib/utils/battle-morale";
import { BattleAction,BattleParticipant } from "@/types/battle";

const moraleCheckSchema = z.object({
  participantId: z.string(), // ID BattleParticipant з initiativeOrder
  d10Roll: z.number().min(1).max(10), // результат кидка 1d10
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

    const data = moraleCheckSchema.parse(body);

    // Отримуємо учасників з initiativeOrder
    const initiativeOrder = battle.initiativeOrder as unknown as BattleParticipant[];

    const participant = initiativeOrder.find((p) => p.id === data.participantId);

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found in battle" },
        { status: 404 }
      );
    }

    // Перевіряємо мораль
    const moraleResult = checkMorale(participant, data.d10Roll);

    // Оновлюємо учасника
    const updatedParticipant: BattleParticipant = {
      ...participant,
      hasExtraTurn: moraleResult.hasExtraTurn,
    };

    // Оновлюємо initiativeOrder
    const updatedInitiativeOrder = initiativeOrder.map((p) =>
      p.id === participant.id ? updatedParticipant : p
    );

    // Створюємо BattleAction для логу
    const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

    const battleAction: BattleAction = {
      id: `morale-${participant.id}-${Date.now()}`,
      battleId,
      round: battle.currentRound,
      actionIndex: battleLog.length,
      timestamp: new Date(),
      actorId: participant.id,
      actorName: participant.name,
      actorSide: participant.side,
      actionType: moraleResult.shouldSkipTurn ? "morale_skip" : "ability",
      targets: [],
      actionDetails: {
        d10Roll: data.d10Roll,
        morale: participant.morale,
      },
      resultText: moraleResult.message,
      hpChanges: [],
      isCancelled: false,
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

    return NextResponse.json({
      battle: updatedBattle,
      moraleResult,
    });
  } catch (error) {
    console.error("Error processing morale check:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
