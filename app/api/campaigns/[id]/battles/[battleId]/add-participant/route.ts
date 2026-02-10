import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import {
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle/battle-participant";
import { calculateInitiative } from "@/lib/utils/battle/battle-start";
import { BattleAction, BattleParticipant } from "@/types/battle";

const addParticipantSchema = z.object({
  sourceId: z.string(),
  type: z.enum(["character", "unit"]),
  side: z.enum(["ally", "enemy"]),
  quantity: z.number().int().min(1).max(10).optional().default(1),
});

/**
 * DM додає учасника (героя/юніта) під час активного бою.
 * Новий учасник отримує хід одразу після завершення ходу поточного активного гравця.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id: campaignId, battleId } = await params;

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

    const body = await request.json();
    const data = addParticipantSchema.parse(body);

    const side =
      data.side === "ally" ? ParticipantSide.ALLY : ParticipantSide.ENEMY;

    const initiativeOrder =
      (battle.initiativeOrder as unknown as BattleParticipant[]) ?? [];
    const currentTurnIndex = battle.currentTurnIndex;
    const insertAt = currentTurnIndex + 1;

    const newParticipants: BattleParticipant[] = [];

    if (data.type === "character") {
      const character = await prisma.character.findUnique({
        where: { id: data.sourceId },
        include: {
          inventory: true,
          characterSkills: { include: { skillTree: true } },
        },
      });

      if (!character || character.campaignId !== campaignId) {
        return NextResponse.json(
          { error: "Character not found" },
          { status: 404 },
        );
      }

      const participant = await createBattleParticipantFromCharacter(
        character,
        battleId,
        side,
      );
      const withInitiative = {
        ...participant,
        abilities: {
          ...participant.abilities,
          initiative: calculateInitiative(participant),
          baseInitiative: calculateInitiative(participant),
        },
      };
      newParticipants.push(withInitiative);
    } else {
      const unit = await prisma.unit.findUnique({
        where: { id: data.sourceId },
      });

      if (!unit || unit.campaignId !== campaignId) {
        return NextResponse.json(
          { error: "Unit not found" },
          { status: 404 },
        );
      }

      const quantity = data.quantity ?? 1;

      for (let i = 0; i < quantity; i++) {
        const participant = await createBattleParticipantFromUnit(
          unit,
          battleId,
          side,
          i + 1,
        );
        const withInitiative = {
          ...participant,
          abilities: {
            ...participant.abilities,
            initiative: calculateInitiative(participant),
            baseInitiative: calculateInitiative(participant),
          },
        };
        newParticipants.push(withInitiative);
      }
    }

    const updatedInitiativeOrder = [
      ...initiativeOrder.slice(0, insertAt),
      ...newParticipants,
      ...initiativeOrder.slice(insertAt),
    ];

    const battleLog = (battle.battleLog as unknown as BattleAction[]) ?? [];
    const logEntry: BattleAction = {
      id: `add-participant-${Date.now()}`,
      battleId,
      round: battle.currentRound,
      actionIndex: battleLog.length,
      timestamp: new Date(),
      actorId: "dm",
      actorName: "DM",
      actorSide: "ally",
      actionType: "ability",
      targets: newParticipants.map((p) => ({
        participantId: p.basicInfo.id,
        participantName: p.basicInfo.name,
      })),
      actionDetails: {},
      resultText: `DM додав на поле: ${newParticipants.map((p) => p.basicInfo.name).join(", ")}`,
      hpChanges: [],
      isCancelled: false,
    };

    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        initiativeOrder:
          updatedInitiativeOrder as unknown as Prisma.InputJsonValue,
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Add participant error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
