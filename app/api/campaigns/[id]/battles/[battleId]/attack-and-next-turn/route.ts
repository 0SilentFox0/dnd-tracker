/**
 * Combined attack + next-turn: one fetch, one write per turn.
 * Replaces separate POST /attack and POST /next-turn for the attack flow.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { attackAndNextTurnSchema } from "./attack-and-next-turn-schema";

import { prisma } from "@/lib/db";
import {
  battleChannelName,
  pusherServer,
  userChannelName,
} from "@/lib/pusher";
import {
  advanceTurnPhase,
  AttackPhaseError,
  runAttackPhase,
} from "@/lib/utils/battle/attack-and-next-turn";
import { getBattleWithAccess } from "@/lib/utils/battle/get-battle-with-access";
import {
  prepareBattleLogForStorage,
  preparePusherPayload,
  slimInitiativeOrderForStorage,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import { executeComplexTriggersForChangedParticipant } from "@/lib/utils/skills/execution";
import type { BattleParticipant } from "@/types/battle";

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

    const { accessResult, battle } = result;

    const { userId } = accessResult;

    const isDM = accessResult.campaign.members[0]?.role === "dm";

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const data = attackAndNextTurnSchema.parse(body);

    const attackResult = runAttackPhase({
      battle: {
        initiativeOrder: battle.initiativeOrder,
        battleLog: battle.battleLog,
        currentRound: battle.currentRound,
        currentTurnIndex: battle.currentTurnIndex,
      },
      data: {
        attackerId: data.attackerId,
        targetId: data.targetId,
        targetIds: data.targetIds,
        attackId: data.attackId,
        d20Roll: data.d20Roll,
        attackRoll: data.attackRoll,
        attackRolls: data.attackRolls,
        advantageRoll: data.advantageRoll,
        disadvantageRoll: data.disadvantageRoll,
        damageRolls: data.damageRolls,
        reactionDamage: data.reactionDamage,
      },
      battleId,
      userId,
      isDM,
    });

    const { finalInitiativeOrder, allBattleActions, baseBattleLog } =
      attackResult;

    let initiativeOrderAfterComplexTriggers = finalInitiativeOrder;

    const changedParticipantIds = Array.from(
      new Set(
        allBattleActions.flatMap((action) =>
          (action.hpChanges ?? [])
            .filter((change) => change.oldHp !== change.newHp)
            .map((change) => change.participantId),
        ),
      ),
    );

    const complexTriggerMessages: string[] = [];

    for (const changedParticipantId of changedParticipantIds) {
      const complexTriggerResult = executeComplexTriggersForChangedParticipant(
        initiativeOrderAfterComplexTriggers,
        changedParticipantId,
        battle.currentRound,
      );

      initiativeOrderAfterComplexTriggers =
        complexTriggerResult.updatedParticipants;
      complexTriggerMessages.push(...complexTriggerResult.messages);
    }

    const complexTriggerLogEntries =
      complexTriggerMessages.length > 0
        ? [
            {
              id: `attack-triggers-${Date.now()}`,
              battleId,
              round: battle.currentRound,
              actionIndex: baseBattleLog.length + allBattleActions.length,
              timestamp: new Date(),
              actorId: "system",
              actorName: "Система",
              actorSide: "ally" as const,
              actionType: "ability" as const,
              targets: [],
              actionDetails: {},
              resultText: `Тригери після зміни HP: ${complexTriggerMessages.join("; ")}`,
              hpChanges: [],
              isCancelled: false,
            },
          ]
        : [];

    const battleLogAfterAttack = [
      ...baseBattleLog,
      ...allBattleActions,
      ...complexTriggerLogEntries,
    ];

    const currentBattleLogLength = battleLogAfterAttack.length;

    const advanceResult = advanceTurnPhase({
      initiativeOrder: initiativeOrderAfterComplexTriggers,
      currentTurnIndex: battle.currentTurnIndex,
      currentRound: battle.currentRound,
      battleId,
      battleLogLength: currentBattleLogLength,
      pendingSummons:
        (battle.pendingSummons as unknown as BattleParticipant[]) ?? [],
      battleStatus: battle.status,
    });

    const {
      updatedInitiativeOrder,
      nextTurnIndex,
      nextRound,
      newLogEntries,
      finalStatus,
      completedAt,
      clearedPendingSummons,
    } = advanceResult;

    const fullBattleLog = [...battleLogAfterAttack, ...newLogEntries];

    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        currentTurnIndex: nextTurnIndex,
        currentRound: nextRound,
        status: finalStatus,
        completedAt: completedAt ?? undefined,
        initiativeOrder: slimInitiativeOrderForStorage(
          updatedInitiativeOrder,
        ) as unknown as Prisma.InputJsonValue,
        pendingSummons: clearedPendingSummons
          ? ([] as unknown as Prisma.InputJsonValue)
          : (battle.pendingSummons as Prisma.InputJsonValue) ?? [],
        battleLog: prepareBattleLogForStorage(
          fullBattleLog,
        ) as unknown as Prisma.InputJsonValue,
      },
    });

    if (process.env.PUSHER_APP_ID) {
      const pusherPayload = preparePusherPayload(updatedBattle);

      const battleChannel = battleChannelName(battleId);

      void pusherServer
        .trigger(battleChannel, "battle-updated", pusherPayload)
        .catch((err) => console.error("Pusher trigger failed:", err));

      if (finalStatus === "completed") {
        void pusherServer
          .trigger(battleChannel, "battle-completed", pusherPayload)
          .catch((err) => console.error("Pusher trigger failed:", err));
      }

      const activeParticipant = updatedInitiativeOrder[nextTurnIndex];

      if (
        activeParticipant &&
        activeParticipant.basicInfo.controlledBy !== "dm"
      ) {
        void pusherServer
          .trigger(
            userChannelName(activeParticipant.basicInfo.controlledBy),
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

    return NextResponse.json(stripStateBeforeForClient(updatedBattle));
  } catch (error) {
    if (error instanceof AttackPhaseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Error in attack-and-next-turn:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
