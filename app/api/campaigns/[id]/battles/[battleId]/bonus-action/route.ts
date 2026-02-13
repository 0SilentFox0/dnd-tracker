import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import {
  preparePusherPayload,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import { executeBonusActionSkill } from "@/lib/utils/skills/skill-triggers-execution";
import { BattleAction, BattleParticipant } from "@/types/battle";

const bonusActionSchema = z.object({
  participantId: z.string(),
  skillId: z.string(),
  targetParticipantId: z.string().optional(),
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
    const data = bonusActionSchema.parse(body);

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

    const isDM = accessResult.campaign.members[0]?.role === "dm";
    const isController =
      participant.basicInfo.controlledBy === accessResult.userId;

    if (!isDM && !isController) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const skill = participant.battleData.activeSkills?.find(
      (s) => s.skillId === data.skillId,
    );

    if (!skill) {
      return NextResponse.json(
        { error: "Skill not found on participant" },
        { status: 400 },
      );
    }

    if (participant.actionFlags.hasUsedBonusAction) {
      return NextResponse.json(
        { error: "Bonus action already used this turn" },
        { status: 400 },
      );
    }

    const skillUsageCounts = { ...participant.battleData.skillUsageCounts };

    const result = executeBonusActionSkill(
      participant,
      skill,
      initiativeOrder,
      battle.currentRound,
      data.targetParticipantId,
      skillUsageCounts,
    );

    const participantIdx = result.updatedParticipants.findIndex(
      (p) => p.basicInfo.id === participant.basicInfo.id,
    );

    let updatedInitiativeOrder = result.updatedParticipants;

    if (participantIdx >= 0) {
      const updated = result.updatedParticipants[participantIdx];
      updatedInitiativeOrder = result.updatedParticipants.map((p, i) =>
        i === participantIdx
          ? { ...updated, battleData: { ...updated.battleData, skillUsageCounts } }
          : p,
      );
    }

    const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

    const battleAction: BattleAction = {
      id: `bonus-${participant.basicInfo.id}-${Date.now()}`,
      battleId,
      round: battle.currentRound,
      actionIndex: battleLog.length,
      timestamp: new Date(),
      actorId: participant.basicInfo.id,
      actorName: participant.basicInfo.name,
      actorSide: participant.basicInfo.side,
      actionType: "ability",
      targets: [],
      actionDetails: { skillId: data.skillId, skillName: skill.name },
      resultText: result.messages.join(" | "),
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

    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");

      void pusherServer
        .trigger(
          `battle-${battleId}`,
          "battle-updated",
          preparePusherPayload(updatedBattle),
        )
        .catch((err) => console.error("Pusher trigger failed:", err));
    }

    return NextResponse.json({
      battle: stripStateBeforeForClient(updatedBattle),
    });
  } catch (error) {
    console.error("Error processing bonus action:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
