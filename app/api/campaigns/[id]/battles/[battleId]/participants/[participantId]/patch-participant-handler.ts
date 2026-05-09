/**
 * Бізнес-логіка PATCH /participants/[participantId] (CODE_AUDIT 1.6).
 *
 * route.ts: тонка (auth + battle fetch + body parse) → executePatchParticipant
 *
 * Тут: dispatcher на removeParticipant() / updateParticipantHp() + Pusher.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import type { PatchParticipantData } from "./patch-participant-schema";

import { prisma } from "@/lib/db";
import { battleChannelName, pusherServer } from "@/lib/pusher";
import {
  preparePusherPayload,
  slimInitiativeOrderForStorage,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import { executeComplexTriggersForChangedParticipant } from "@/lib/utils/skills/execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface ExecutePatchParticipantInput {
  campaignId: string;
  battleId: string;
  participantId: string;
  battle: {
    currentTurnIndex: number;
    currentRound: number;
    initiativeOrder: unknown;
    battleLog: unknown;
  };
  data: PatchParticipantData;
}

export async function executePatchParticipant(
  input: ExecutePatchParticipantInput,
): Promise<NextResponse> {
  const { data } = input;

  if (data.removeFromBattle === true) {
    return await removeParticipant(input);
  }

  if (data.currentHp !== undefined) {
    return await updateParticipantHp(input);
  }

  return NextResponse.json(
    { error: "Provide currentHp or removeFromBattle" },
    { status: 400 },
  );
}

async function removeParticipant(
  input: ExecutePatchParticipantInput,
): Promise<NextResponse> {
  const { battleId, participantId, battle } = input;

  let initiativeOrder =
    (battle.initiativeOrder as BattleParticipant[]) ?? [];

  const battleLog = (battle.battleLog as BattleAction[]) ?? [];

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
      battle.currentTurnIndex -
        (removedIndex < battle.currentTurnIndex ? 1 : 0),
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

  triggerBattleUpdatedEvent(battleId, updatedBattle);

  return NextResponse.json(stripStateBeforeForClient(updatedBattle));
}

async function updateParticipantHp(
  input: ExecutePatchParticipantInput,
): Promise<NextResponse> {
  const { battleId, participantId, battle, data } = input;

  const initiativeOrder =
    (battle.initiativeOrder as BattleParticipant[]) ?? [];

  const battleLog = (battle.battleLog as BattleAction[]) ?? [];

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

  const newHp = Math.min(data.currentHp ?? 0, participant.combatStats.maxHp);

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

  triggerBattleUpdatedEvent(battleId, updatedBattle);

  return NextResponse.json(stripStateBeforeForClient(updatedBattle));
}

function triggerBattleUpdatedEvent(
  battleId: string,
  updatedBattle: Awaited<ReturnType<typeof prisma.battleScene.update>>,
): void {
  if (!process.env.PUSHER_APP_ID) return;

  void pusherServer
    .trigger(
      battleChannelName(battleId),
      "battle-updated",
      preparePusherPayload(updatedBattle),
    )
    .catch((err) => console.error("Pusher trigger failed:", err));
}
