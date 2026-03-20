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
import { pusherServer } from "@/lib/pusher";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import {
  prepareBattleLogForStorage,
  preparePusherPayload,
  slimInitiativeOrderForStorage,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  const t0 = Date.now();

  console.info("[next-turn] Запит почато");

  try {
    const { id, battleId } = await params;

    debugBattleSync("request received", { campaignId: id, battleId });

    const accessResult = await requireCampaignAccess(id, false);

    console.info("[next-turn] auth", { ms: Date.now() - t0 });

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { userId } = accessResult;

    const isDM = accessResult.campaign.members[0]?.role === "dm";

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
      select: {
        id: true,
        campaignId: true,
        status: true,
        currentTurnIndex: true,
        currentRound: true,
        initiativeOrder: true,
        pendingSummons: true,
        pendingMoraleCheck: true,
        battleLog: true,
        completedAt: true,
      },
    });

    console.info("[next-turn] battle fetch", { ms: Date.now() - t0 });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    let initiativeOrder =
      battle.initiativeOrder as unknown as BattleParticipant[];

    let battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

    let currentBattleLogLength = battleLog.length;

    // Застосовуємо pendingMoraleCheck перед advance (extra turn, тригери, лог)
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
      campaignId: id,
      battleId,
      snapshot: battleStateSnapshot(
        initiativeOrder,
        battle.currentTurnIndex,
        battle.currentRound,
        battle.status,
      ),
      battleLogCount:
        (battle.battleLog as unknown as BattleAction[] | undefined)?.length ?? 0,
    });

    const currentParticipant = initiativeOrder[battle.currentTurnIndex];

    if (!currentParticipant) {
      return NextResponse.json(
        { error: "Current participant not found" },
        { status: 404 },
      );
    }

    const canAdvanceTurn =
      isDM ||
      currentParticipant.basicInfo.controlledBy === userId;

    if (!canAdvanceTurn) {
      return NextResponse.json(
        { error: "Forbidden: only DM or current turn controller can advance" },
        { status: 403 },
      );
    }

    const loopResult = runAdvanceTurnLoop({
      initiativeOrder,
      currentTurnIndex: battle.currentTurnIndex,
      currentRound: battle.currentRound,
      battleId,
      currentBattleLogLength,
      pendingSummons:
        (battle.pendingSummons as unknown as BattleParticipant[]) ?? [],
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

    // Оновлюємо бій (очищаємо pendingSummons і pendingMoraleCheck після обробки)
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
      campaignId: id,
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

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const pusherPayload = preparePusherPayload(updatedBattle);

      debugBattleSync("trigger battle-updated", {
        channel: `battle-${battleId}`,
        event: "battle-updated",
      });
      void pusherServer
        .trigger(`battle-${battleId}`, "battle-updated", pusherPayload)
        .catch((err) => console.error("Pusher trigger failed:", err));

      if (finalStatus === "completed") {
        debugBattleSync("trigger battle-completed", {
          channel: `battle-${battleId}`,
          event: "battle-completed",
        });
        void pusherServer
          .trigger(`battle-${battleId}`, "battle-completed", pusherPayload)
          .catch((err) => console.error("Pusher trigger failed:", err));
      }

      const activeParticipant = finalInitiativeOrder[nextTurnIndex];

      if (
        activeParticipant &&
        activeParticipant.basicInfo.controlledBy !== "dm"
      ) {
        debugBattleSync("trigger turn-started", {
          channel: `user-${activeParticipant.basicInfo.controlledBy}`,
          event: "turn-started",
          participantId: activeParticipant.basicInfo.id,
          participantName: activeParticipant.basicInfo.name,
        });
        void pusherServer
          .trigger(
            `user-${activeParticipant.basicInfo.controlledBy}`,
            "turn-started",
            {
              battleId,
              participantId: activeParticipant.basicInfo.id,
              participantName: activeParticipant.basicInfo.name,
            },
          )
          .catch((err) => console.error("Pusher trigger failed:", err));
      }
    }

    const totalMs = Date.now() - t0;

    console.info("[next-turn] Запит завершено", { totalMs });

    return NextResponse.json(stripStateBeforeForClient(updatedBattle));
  } catch (error) {
    console.error("Error advancing turn:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
