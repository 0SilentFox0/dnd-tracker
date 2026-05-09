/**
 * Бізнес-логіка POST /next-turn — винесена з route.ts (CODE_AUDIT 1.4).
 *
 * route.ts: тонка (auth + battle fetch + permission на advance) → executeAdvanceTurn
 *
 * Тут: applyPendingMoraleCheck, runAdvanceTurnLoop, applyVictoryCompletion,
 * запис у БД, Pusher trigger.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import type { PendingMoraleCheckPayload } from "../morale-check/route";
import { runAdvanceTurnLoop } from "./next-turn-advance";
import { applyPendingMoraleCheck } from "./next-turn-apply-morale";
import {
  applyVictoryCompletion,
  battleStateSnapshot,
  debugBattleSync,
  logTurnTiming,
} from "./next-turn-helpers";

import { prisma } from "@/lib/db";
import {
  battleChannelName,
  pusherServer,
  userChannelName,
} from "@/lib/pusher";
import {
  prepareBattleLogForStorage,
  preparePusherPayload,
  slimInitiativeOrderForStorage,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import { safePusherTrigger } from "@/lib/utils/pusher/safe-trigger";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface ExecuteAdvanceTurnInput {
  campaignId: string;
  battleId: string;
  battle: {
    currentTurnIndex: number;
    currentRound: number;
    status: string;
    initiativeOrder: unknown;
    pendingSummons: unknown;
    pendingMoraleCheck: unknown;
    battleLog: unknown;
    completedAt: Date | null;
  };
  /** Час старту запиту — для логування. */
  t0: number;
}

export async function executeAdvanceTurn(
  input: ExecuteAdvanceTurnInput,
): Promise<NextResponse> {
  const { campaignId, battleId, battle, t0 } = input;

  let initiativeOrder =
    battle.initiativeOrder as BattleParticipant[];

  let battleLog = (battle.battleLog as BattleAction[]) || [];

  let currentBattleLogLength = battleLog.length;

  const pendingMorale = battle.pendingMoraleCheck as
    | PendingMoraleCheckPayload
    | null
    | undefined;

  if (pendingMorale) {
    const { updatedInitiativeOrder, moraleLogEntry } = applyPendingMoraleCheck(
      initiativeOrder,
      pendingMorale,
      battle.currentRound,
      battleId,
      battleLog.length,
    );

    initiativeOrder = updatedInitiativeOrder;
    battleLog = [...battleLog, moraleLogEntry];
    currentBattleLogLength = battleLog.length;
  }

  debugBattleSync("loaded battle", {
    campaignId,
    battleId,
    snapshot: battleStateSnapshot(
      initiativeOrder,
      battle.currentTurnIndex,
      battle.currentRound,
      battle.status,
    ),
    battleLogCount:
      (battle.battleLog as BattleAction[] | undefined)?.length ?? 0,
  });

  const loopResult = runAdvanceTurnLoop({
    initiativeOrder,
    currentTurnIndex: battle.currentTurnIndex,
    currentRound: battle.currentRound,
    battleId,
    currentBattleLogLength,
    pendingSummons:
      (battle.pendingSummons as BattleParticipant[]) ?? [],
  });

  const {
    updatedInitiativeOrder,
    nextTurnIndex,
    nextRound,
    newLogEntries,
    clearedPendingSummons,
  } = loopResult;

  logTurnTiming("while loop (triggers, startOfTurn)", t0, {});

  const getStateBeforeForEntry = () => ({
    initiativeOrder: slimInitiativeOrderForStorage(updatedInitiativeOrder),
    currentTurnIndex: nextTurnIndex,
    currentRound: nextRound,
  });

  const victoryResult = applyVictoryCompletion({
    updatedInitiativeOrder,
    initiativeOrder,
    battleStatus: battle.status,
    battleId,
    nextRound,
    currentBattleLogLength,
    newLogEntries,
    getStateBeforeForEntry,
  });

  const finalInitiativeOrder = victoryResult.updatedInitiativeOrder;

  const finalStatus = victoryResult.finalStatus;

  const completedAt = victoryResult.completedAt ?? battle.completedAt;

  const tBeforeUpdate = Date.now();

  const updatedBattle = await prisma.battleScene.update({
    where: { id: battleId },
    data: {
      currentTurnIndex: nextTurnIndex,
      currentRound: nextRound,
      status: finalStatus,
      completedAt: completedAt || undefined,
      initiativeOrder: slimInitiativeOrderForStorage(
        finalInitiativeOrder,
      ) as unknown as Prisma.InputJsonValue,
      pendingSummons: clearedPendingSummons
        ? ([] as unknown as Prisma.InputJsonValue)
        : (battle.pendingSummons as Prisma.InputJsonValue) ?? [],
      pendingMoraleCheck: Prisma.JsonNull,
      battleLog: prepareBattleLogForStorage([
        ...battleLog,
        ...newLogEntries,
      ]) as unknown as Prisma.InputJsonValue,
    },
  });

  console.info("[next-turn] prisma update", {
    ms: Date.now() - tBeforeUpdate,
    battleLogSize: battleLog.length + newLogEntries.length,
  });

  debugBattleSync("battle updated", {
    campaignId,
    battleId,
    snapshot: battleStateSnapshot(
      finalInitiativeOrder,
      nextTurnIndex,
      nextRound,
      finalStatus,
    ),
    newLogEntries: newLogEntries.length,
    totalBattleLogCount: battleLog.length + newLogEntries.length,
  });

  if (process.env.PUSHER_APP_ID) {
    triggerPusherEvents({
      battleId,
      battle: updatedBattle,
      finalStatus,
      finalInitiativeOrder,
      nextTurnIndex,
    });
  }

  const totalMs = Date.now() - t0;

  console.info("[next-turn] Запит завершено", { totalMs });

  return NextResponse.json(stripStateBeforeForClient(updatedBattle));
}

function triggerPusherEvents(input: {
  battleId: string;
  battle: Awaited<ReturnType<typeof prisma.battleScene.update>>;
  finalStatus: string;
  finalInitiativeOrder: BattleParticipant[];
  nextTurnIndex: number;
}): void {
  const { battleId, battle, finalStatus, finalInitiativeOrder, nextTurnIndex } =
    input;

  const pusherPayload = preparePusherPayload(battle);

  const battleChannel = battleChannelName(battleId);

  const ctx = { action: "advance turn", battleId };

  debugBattleSync("trigger battle-updated", {
    channel: battleChannel,
    event: "battle-updated",
  });
  safePusherTrigger(pusherServer, battleChannel, "battle-updated", pusherPayload, ctx);

  if (finalStatus === "completed") {
    debugBattleSync("trigger battle-completed", {
      channel: battleChannel,
      event: "battle-completed",
    });
    safePusherTrigger(pusherServer, battleChannel, "battle-completed", pusherPayload, ctx);
  }

  const activeParticipant = finalInitiativeOrder[nextTurnIndex];

  if (
    activeParticipant &&
    activeParticipant.basicInfo.controlledBy !== "dm"
  ) {
    const userChannel = userChannelName(
      activeParticipant.basicInfo.controlledBy,
    );

    debugBattleSync("trigger turn-started", {
      channel: userChannel,
      event: "turn-started",
      participantId: activeParticipant.basicInfo.id,
      participantName: activeParticipant.basicInfo.name,
    });
    safePusherTrigger(
      pusherServer,
      userChannel,
      "turn-started",
      {
        battleId,
        participantId: activeParticipant.basicInfo.id,
        participantName: activeParticipant.basicInfo.name,
      },
      ctx,
    );
  }
}
