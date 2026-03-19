import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { checkMorale } from "@/lib/utils/battle/battle-morale";
import { getBattleWithAccess } from "@/lib/utils/battle/get-battle-with-access";
import { stripStateBeforeForClient } from "@/lib/utils/battle/strip-battle-payload";
import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";

const moraleCheckSchema = z.object({
  participantId: z.string(), // ID BattleParticipant з initiativeOrder
  d10Roll: z.number().min(1).max(10), // результат кидка 1d10
});

/** Payload збережений у pendingMoraleCheck для застосування при next-turn */
export interface PendingMoraleCheckPayload {
  participantId: string;
  d10Roll: number;
  moraleResult: MoraleCheckResult;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id, battleId } = await params;

    const result = await getBattleWithAccess(id, battleId);

    if (result instanceof NextResponse) {
      return result;
    }

    const { accessResult, battle, initiativeOrder } = result;

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const data = moraleCheckSchema.parse(body);

    const participant = initiativeOrder.find(
      (p) => p.basicInfo.id === data.participantId,
    );

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found in battle" },
        { status: 404 },
      );
    }

    // Дозволяємо DM або гравцю, який контролює цього учасника
    const isDM = accessResult.campaign.members[0]?.role === "dm";

    const isController =
      participant.basicInfo.controlledBy === accessResult.userId;

    if (!isDM && !isController) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Лише обчислюємо результат; застосування (extra turn, skip, тригери) — при next-turn
    const moraleResult = checkMorale(participant, data.d10Roll);

    const pendingPayload: PendingMoraleCheckPayload = {
      participantId: data.participantId,
      d10Roll: data.d10Roll,
      moraleResult,
    };

    // Зберігаємо результат для next-turn; бій не змінюємо (initiativeOrder, battleLog лишаються)
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        pendingMoraleCheck: pendingPayload as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      battle: stripStateBeforeForClient(updatedBattle),
      moraleResult,
    });
  } catch (error) {
    console.error("Error processing morale check:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
