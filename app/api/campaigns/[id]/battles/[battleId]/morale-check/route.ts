import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { checkMorale } from "@/lib/utils/battle/battle-morale";
import { executeSkillsByTrigger } from "@/lib/utils/skills/skill-triggers-execution";
import { BattleAction, BattleParticipant } from "@/types/battle";

const moraleCheckSchema = z.object({
  participantId: z.string(), // ID BattleParticipant з initiativeOrder
  d10Roll: z.number().min(1).max(10), // результат кидка 1d10
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireCampaignAccess(id, false);

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

    const data = moraleCheckSchema.parse(body);

    // Отримуємо учасників з initiativeOrder
    const initiativeOrder =
      battle.initiativeOrder as unknown as BattleParticipant[];

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

    // Перевіряємо мораль
    const moraleResult = checkMorale(participant, data.d10Roll);

    // Отримуємо учасників з initiativeOrder
    let updatedInitiativeOrder = [...initiativeOrder];

    // Якщо є додатковий хід, додаємо його в кінець черги ЦЬОГО раунду
    if (moraleResult.hasExtraTurn) {
      const extraParticipant: BattleParticipant = {
        ...participant,
        basicInfo: {
          ...participant.basicInfo,
          id: `${participant.basicInfo.id}-extra-${Date.now()}`,
          isExtraTurnSlot: true,
        },
        actionFlags: {
          ...participant.actionFlags,
          hasExtraTurn: false, // видаляємо флаг зі слота, щоб не було рекурсії
          hasUsedAction: false,
          hasUsedBonusAction: false,
          hasUsedReaction: false,
        },
      };

      updatedInitiativeOrder.push(extraParticipant);
    }

    // Тригери скілів: onMoraleSuccess для учасника, allyMoraleCheck для союзників
    const moraleSuccess =
      moraleResult.hasExtraTurn || !moraleResult.shouldSkipTurn;
    if (moraleSuccess) {
      const participantIdx = updatedInitiativeOrder.findIndex(
        (p) => p.basicInfo.id === participant.basicInfo.id,
      );
      if (participantIdx >= 0) {
        const result = executeSkillsByTrigger(
          updatedInitiativeOrder[participantIdx],
          "onMoraleSuccess",
          updatedInitiativeOrder,
          { currentRound: battle.currentRound },
        );
        updatedInitiativeOrder = updatedInitiativeOrder.map((p, i) =>
          i === participantIdx ? result.participant : p,
        );
      }
    }
    // allyMoraleCheck для союзників
    const allies = updatedInitiativeOrder.filter(
      (p) =>
        p.basicInfo.side === participant.basicInfo.side &&
        p.basicInfo.id !== participant.basicInfo.id,
    );
    for (const ally of allies) {
      const allyIdx = updatedInitiativeOrder.findIndex(
        (p) => p.basicInfo.id === ally.basicInfo.id,
      );
      if (allyIdx >= 0) {
        const result = executeSkillsByTrigger(
          updatedInitiativeOrder[allyIdx],
          "allyMoraleCheck",
          updatedInitiativeOrder,
          { currentRound: battle.currentRound },
        );
        updatedInitiativeOrder = updatedInitiativeOrder.map((p, i) =>
          i === allyIdx ? result.participant : p,
        );
      }
    }

    // Створюємо BattleAction для логу
    const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

    const battleAction: BattleAction = {
      id: `morale-${participant.basicInfo.id}-${Date.now()}`,
      battleId,
      round: battle.currentRound,
      actionIndex: battleLog.length,
      timestamp: new Date(),
      actorId: participant.basicInfo.id,
      actorName: participant.basicInfo.name,
      actorSide: participant.basicInfo.side,
      actionType: moraleResult.shouldSkipTurn ? "morale_skip" : "ability",
      targets: [],
      actionDetails: {
        d10Roll: data.d10Roll,
        morale: participant.combatStats.morale,
      },
      resultText: moraleResult.message,
      hpChanges: [],
      isCancelled: false,
      stateBefore: {
        initiativeOrder: JSON.parse(
          JSON.stringify(initiativeOrder),
        ) as BattleParticipant[],
        currentTurnIndex: battle.currentTurnIndex,
        currentRound: battle.currentRound,
      },
    };

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        initiativeOrder:
          updatedInitiativeOrder as unknown as Prisma.InputJsonValue,
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
        updatedBattle,
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
      { status: 500 },
    );
  }
}
