import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import {
  preparePusherPayload,
  slimInitiativeOrderForStorage,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import { executeComplexTriggersForChangedParticipant } from "@/lib/utils/skills/execution";
import { BattleAction, BattleParticipant } from "@/types/battle";

const patchSchema = z
  .object({
    currentHp: z.number().int().min(0).optional(),
    removeFromBattle: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
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

    let body: unknown;

    try {
      body = await request.json();
    } catch (err) {
      console.warn("Invalid JSON in PATCH participant", {
        campaignId,
        battleId,
        participantId,
        error: err instanceof Error ? err.message : String(err),
      });

      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

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
          initiativeOrder: slimInitiativeOrderForStorage(
            initiativeOrder,
          ) as unknown as Prisma.InputJsonValue,
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
        const { pusherServer, battleChannelName } = await import("@/lib/pusher");

        void pusherServer
          .trigger(
            battleChannelName(battleId),
            "battle-updated",
            preparePusherPayload(updatedBattle),
          )
          .catch((err) => console.error("Pusher trigger failed:", err));
      }

      return NextResponse.json(stripStateBeforeForClient(updatedBattle));
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

      const complexTriggerResult = executeComplexTriggersForChangedParticipant(
        updatedOrder,
        updatedParticipant.basicInfo.id,
        battle.currentRound,
      );

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

      const triggerLogEntry =
        complexTriggerResult.messages.length > 0
          ? ({
              id: `hp-triggers-${participantId}-${Date.now()}`,
              battleId,
              round: battle.currentRound,
              actionIndex: battleLog.length + 1,
              timestamp: new Date(),
              actorId: "system",
              actorName: "Система",
              actorSide: "ally",
              actionType: "ability",
              targets: [],
              actionDetails: {},
              resultText: `Тригери після зміни HP: ${complexTriggerResult.messages.join("; ")}`,
              hpChanges: [],
              isCancelled: false,
            } satisfies BattleAction)
          : null;

      const updatedBattle = await prisma.battleScene.update({
        where: { id: battleId },
        data: {
          initiativeOrder: slimInitiativeOrderForStorage(
            complexTriggerResult.updatedParticipants,
          ) as unknown as Prisma.InputJsonValue,
          battleLog: [
            ...battleLog,
            logEntry,
            ...(triggerLogEntry ? [triggerLogEntry] : []),
          ] as unknown as Prisma.InputJsonValue,
        },
      });

      if (process.env.PUSHER_APP_ID) {
        const { pusherServer, battleChannelName } = await import("@/lib/pusher");

        void pusherServer
          .trigger(
            battleChannelName(battleId),
            "battle-updated",
            preparePusherPayload(updatedBattle),
          )
          .catch((err) => console.error("Pusher trigger failed:", err));
      }

      return NextResponse.json(stripStateBeforeForClient(updatedBattle));
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
