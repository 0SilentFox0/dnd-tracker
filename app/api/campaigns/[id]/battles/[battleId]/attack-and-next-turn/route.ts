/**
 * Combined attack + next-turn: one fetch, one write per turn.
 * Replaces separate POST /attack and POST /next-turn for the attack flow.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import {
  advanceTurnPhase,
  AttackPhaseError,
  runAttackPhase,
} from "@/lib/utils/battle/attack-and-next-turn";
import {
  prepareBattleLogForStorage,
  preparePusherPayload,
  slimInitiativeOrderForStorage,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import type { BattleParticipant } from "@/types/battle";

const attackSchema = z
  .object({
    attackerId: z.string(),
    targetId: z.string().optional(),
    targetIds: z.array(z.string()).optional(),
    attackId: z.string().optional(),
    d20Roll: z.number().min(1).max(20).optional(),
    attackRoll: z.number().min(1).max(20).optional(),
    advantageRoll: z.number().min(1).max(20).optional(),
    damageRolls: z.array(z.number()).default([]),
  })
  .refine(
    (data) => data.d20Roll !== undefined || data.attackRoll !== undefined,
    { message: "d20Roll або attackRoll обов'язковий", path: ["d20Roll"] },
  )
  .refine(
    (data) =>
      data.targetId !== undefined ||
      (data.targetIds !== undefined && data.targetIds.length > 0),
    { message: "Потрібно вказати хоча б одну ціль", path: ["targetIds"] },
  );

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

    const { userId } = accessResult;

    const isDM = accessResult.campaign.members[0]?.role === "dm";

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

    const data = attackSchema.parse(body);

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
        advantageRoll: data.advantageRoll,
        damageRolls: data.damageRolls,
      },
      battleId,
      userId,
      isDM,
    });

    const { finalInitiativeOrder, allBattleActions, baseBattleLog } =
      attackResult;

    const battleLogAfterAttack = [...baseBattleLog, ...allBattleActions];

    const currentBattleLogLength = battleLogAfterAttack.length;

    const advanceResult = advanceTurnPhase({
      initiativeOrder: finalInitiativeOrder,
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

      void pusherServer
        .trigger(`battle-${battleId}`, "battle-updated", pusherPayload)
        .catch((err) => console.error("Pusher trigger failed:", err));

      if (finalStatus === "completed") {
        void pusherServer
          .trigger(`battle-${battleId}`, "battle-completed", pusherPayload)
          .catch((err) => console.error("Pusher trigger failed:", err));
      }

      const activeParticipant = updatedInitiativeOrder[nextTurnIndex];

      if (
        activeParticipant &&
        activeParticipant.basicInfo.controlledBy !== "dm"
      ) {
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
