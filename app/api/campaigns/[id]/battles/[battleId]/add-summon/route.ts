import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { BattleAction, BattleParticipant } from "@/types/battle";

const summonSchema = z.object({
  name: z.string().min(1),
  side: z.enum(["ally", "enemy"]),
  maxHp: z.number().int().min(1),
  armorClass: z.number().int().min(0).default(10),
  initiative: z.number().int().default(10),
  /** ID заклинача (BattleParticipant) для логу */
  casterId: z.string().optional(),
  casterName: z.string().optional(),
});

/**
 * Додати призвану істоту (заклинанням тощо). З’явиться на початку наступного раунду.
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
    const data = summonSchema.parse(body);

    const side =
      data.side === "ally" ? ParticipantSide.ALLY : ParticipantSide.ENEMY;

    const summonId = `summon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const summoned: BattleParticipant = {
      basicInfo: {
        id: summonId,
        battleId,
        sourceId: summonId,
        sourceType: "unit",
        name: data.name,
        side,
        controlledBy: "dm",
      },
      abilities: {
        level: 1,
        initiative: data.initiative,
        baseInitiative: data.initiative,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        modifiers: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
        proficiencyBonus: 2,
        race: "",
      },
      combatStats: {
        maxHp: data.maxHp,
        currentHp: data.maxHp,
        tempHp: 0,
        armorClass: data.armorClass,
        speed: 30,
        morale: 0,
        status: "active",
        minTargets: 1,
        maxTargets: 1,
      },
      spellcasting: {
        spellcastingClass: undefined,
        spellcastingAbility: undefined,
        spellSaveDC: undefined,
        spellAttackBonus: undefined,
        spellSlots: {},
        knownSpells: [],
      },
      battleData: {
        attacks: [],
        activeEffects: [],
        passiveAbilities: [],
        racialAbilities: [],
        activeSkills: [],
        equippedArtifacts: [],
        skillUsageCounts: {},
      },
      actionFlags: {
        hasUsedAction: false,
        hasUsedBonusAction: false,
        hasUsedReaction: false,
        hasExtraTurn: false,
      },
    };

    const pendingSummons =
      (battle.pendingSummons as unknown as BattleParticipant[]) ?? [];
    const newPending = [...pendingSummons, summoned];

    const battleLog = (battle.battleLog as unknown as BattleAction[]) ?? [];
    const who = data.casterName || "Хтось";
    const logEntry: BattleAction = {
      id: `summon-${Date.now()}`,
      battleId,
      round: battle.currentRound,
      actionIndex: battleLog.length,
      timestamp: new Date(),
      actorId: data.casterId || "dm",
      actorName: who,
      actorSide: "ally",
      actionType: "ability",
      targets: [
        {
          participantId: summoned.basicInfo.id,
          participantName: summoned.basicInfo.name,
        },
      ],
      actionDetails: {},
      resultText: `Призовано істоту: ${data.name} (з’явиться на початку наступного раунду)`,
      hpChanges: [],
      isCancelled: false,
    };

    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        pendingSummons: newPending as unknown as Prisma.InputJsonValue,
        battleLog: [
          ...battleLog,
          logEntry,
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    if (process.env.PUSHER_APP_ID) {
      const { pusherServer } = await import("@/lib/pusher");
      await pusherServer.trigger(
        `battle-${battleId}`,
        "battle-updated",
        updatedBattle,
      );
    }

    return NextResponse.json(updatedBattle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Add summon error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
