import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { BattleAction, BattleParticipant } from "@/types/battle";

const patchSchema = z.object({
  currentHp: z.number().int().min(0).optional(),
  removeFromBattle: z.boolean().optional(),
});

/**
 * DM: змінити HP учасника або видалити його з бою.
 */
export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; battleId: string; participantId: string }> },
) {
  try {
    const { id: campaignId, battleId, participantId } = await params;

    const accessResult = await requireDM(campaignId);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== campaignId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const data = patchSchema.parse(body);

    let initiativeOrder =
      (battle.initiativeOrder as unknown as BattleParticipant[]) ?? [];
    const battleLog = (battle.battleLog as unknown as BattleAction[]) ?? [];

    if (data.removeFromBattle === true) {
      const participant = initiativeOrder.find(
        (p) => p.basicInfo.id === participantId,
      );
      if (!participant) {
        return NextResponse.json(
          { error: "Participant not found" },
          { status: 404 },
        );
      }

      const removedIndex = initiativeOrder.findIndex(
        (p) => p.basicInfo.id === participantId,
      );

      initiativeOrder = initiativeOrder.filter(
        (p) => p.basicInfo.id !== participantId,
      );

      let newTurnIndex = battle.currentTurnIndex;
      if (initiativeOrder.length === 0) {
        newTurnIndex = 0;
      } else if (removedIndex <= battle.currentTurnIndex) {
        newTurnIndex = Math.max(
          0,
          battle.currentTurnIndex - (removedIndex < battle.currentTurnIndex ? 1 : 0),
        );
        if (newTurnIndex >= initiativeOrder.length) {
          newTurnIndex = initiativeOrder.length - 1;
        }
      }

      const logEntry: BattleAction = {
        id: `remove-${participantId}-${Date.now()}`,
        battleId,
        round: battle.currentRound,
        actionIndex: battleLog.length,
        timestamp: new Date(),
        actorId: "dm",
        actorName: "DM",
        actorSide: "ally",
        actionType: "ability",
        targets: [],
        actionDetails: {},
        resultText: `DM видалив з бою: ${participant.basicInfo.name}`,
        hpChanges: [],
        isCancelled: false,
      };

      const updatedBattle = await prisma.battleScene.update({
        where: { id: battleId },
        data: {
          initiativeOrder:
            initiativeOrder as unknown as Prisma.InputJsonValue,
          currentTurnIndex: Math.min(
            newTurnIndex,
            Math.max(0, initiativeOrder.length - 1),
          ),
          battleLog: [
            ...battleLog,
            logEntry,
          ] as unknown as Prisma.InputJsonValue,
        },
      });

      if (process.env.PUSHER_APP_ID) {
        const { pusherServer } = await import("@/lib/pusher");
        void pusherServer
          .trigger(`battle-${battleId}`, "battle-updated", updatedBattle)
          .catch((err) => console.error("Pusher trigger failed:", err));
      }

      return NextResponse.json(updatedBattle);
    }

    if (data.currentHp !== undefined) {
      const idx = initiativeOrder.findIndex(
        (p) => p.basicInfo.id === participantId,
      );
      if (idx === -1) {
        return NextResponse.json(
          { error: "Participant not found" },
          { status: 404 },
        );
      }

      const participant = initiativeOrder[idx];
      const oldHp = participant.combatStats.currentHp;
      const newHp = Math.min(
        data.currentHp,
        participant.combatStats.maxHp,
      );
      const updatedParticipant: BattleParticipant = {
        ...participant,
        combatStats: {
          ...participant.combatStats,
          currentHp: newHp,
          status:
            newHp <= 0
              ? participant.combatStats.status === "dead"
                ? "dead"
                : "unconscious"
              : participant.combatStats.status,
        },
      };

      const updatedOrder = [...initiativeOrder];
      updatedOrder[idx] = updatedParticipant;

      const logEntry: BattleAction = {
        id: `hp-${participantId}-${Date.now()}`,
        battleId,
        round: battle.currentRound,
        actionIndex: battleLog.length,
        timestamp: new Date(),
        actorId: "dm",
        actorName: "DM",
        actorSide: "ally",
        actionType: "ability",
        targets: [
          {
            participantId: updatedParticipant.basicInfo.id,
            participantName: updatedParticipant.basicInfo.name,
          },
        ],
        actionDetails: {},
        resultText: `DM змінив HP ${updatedParticipant.basicInfo.name}: ${oldHp} → ${newHp}`,
        hpChanges: [
          {
            participantId: updatedParticipant.basicInfo.id,
            participantName: updatedParticipant.basicInfo.name,
            oldHp,
            newHp,
            change: oldHp - newHp,
          },
        ],
        isCancelled: false,
      };

      const updatedBattle = await prisma.battleScene.update({
        where: { id: battleId },
        data: {
          initiativeOrder:
            updatedOrder as unknown as Prisma.InputJsonValue,
          battleLog: [
            ...battleLog,
            logEntry,
          ] as unknown as Prisma.InputJsonValue,
        },
      });

      if (process.env.PUSHER_APP_ID) {
        const { pusherServer } = await import("@/lib/pusher");
        void pusherServer
          .trigger(`battle-${battleId}`, "battle-updated", updatedBattle)
          .catch((err) => console.error("Pusher trigger failed:", err));
      }

      return NextResponse.json(updatedBattle);
    }

    return NextResponse.json(
      { error: "Provide currentHp or removeFromBattle" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Patch participant error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
