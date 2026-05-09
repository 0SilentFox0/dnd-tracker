/**
 * Бізнес-логіка POST /start — винесена з route.ts (CODE_AUDIT 1.5).
 *
 * route.ts: тонка (auth + battle fetch + status check) → executeStartBattle
 *
 * Тут: завантаження учасників, побудова slot-ів, paralel створення
 * BattleParticipant, ефекти/тригери на старт бою, розрахунок ініціативи,
 * сортування, БД update, Pusher trigger.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { buildCampaignContextForStart } from "./start-build-context";
import { battleStateSnapshot, debugBattleSync } from "./start-helpers";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { battleChannelName, pusherServer } from "@/lib/pusher";
import { distributePendingScopedArtifactBonuses } from "@/lib/utils/battle/artifact-sets";
import {
  applyStartOfBattleEffects,
  calculateInitiative,
  sortByInitiative,
} from "@/lib/utils/battle/battle-start";
import {
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle/participant";
import {
  preparePusherPayload,
  slimInitiativeOrderForStorage,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import {
  executeOnBattleStartEffectsForAll,
  executeStartOfRoundTriggers,
} from "@/lib/utils/skills/execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface ExecuteStartBattleInput {
  campaignId: string;
  battleId: string;
  battle: {
    participants: unknown;
  };
}

export async function executeStartBattle(
  input: ExecuteStartBattleInput,
): Promise<NextResponse> {
  const { campaignId, battleId, battle } = input;

  const participantsRaw = battle.participants as Array<{
    id: string;
    type: "character" | "unit";
    side: string;
    quantity?: number;
  }>;

  const participants = participantsRaw.map((p) => ({
    ...p,
    side: (p.side === ParticipantSide.ALLY
      ? ParticipantSide.ALLY
      : ParticipantSide.ENEMY) as ParticipantSide,
  }));

  const { charIds, unitIds } = participants.reduce(
    (acc, p) => {
      if (p.type === "character") acc.charIds.push(p.id);
      else acc.unitIds.push(p.id);

      return acc;
    },
    { charIds: [] as string[], unitIds: [] as string[] },
  );

  const [characters, units] = await Promise.all([
    charIds.length > 0
      ? prisma.character.findMany({
          where: { id: { in: charIds } },
          include: {
            inventory: true,
            characterSkills: {
              include: { skillTree: true },
            },
          },
        })
      : [],
    unitIds.length > 0
      ? prisma.unit.findMany({
          where: { id: { in: unitIds } },
        })
      : [],
  ]);

  const characterMap = new Map(characters.map((c) => [c.id, c]));

  const unitMap = new Map(units.map((u) => [u.id, u]));

  const { campaignContext, racesByName, uniqueRaceNames } =
    await buildCampaignContextForStart(campaignId, characters, units);

  type ParticipantSlot =
    | { type: "character"; character: (typeof characters)[number]; side: ParticipantSide }
    | {
        type: "unit";
        unit: (typeof units)[number];
        side: ParticipantSide;
        instanceNumber: number;
      };

  const slots: ParticipantSlot[] = [];

  for (const participant of participants) {
    if (participant.type === "character") {
      const character = characterMap.get(participant.id);

      if (character) {
        slots.push({ type: "character", character, side: participant.side });
      }
    } else if (participant.type === "unit") {
      const unit = unitMap.get(participant.id);

      if (unit) {
        const quantity = participant.quantity || 1;

        for (let i = 0; i < quantity; i++) {
          slots.push({
            type: "unit",
            unit,
            side: participant.side,
            instanceNumber: i + 1,
          });
        }
      }
    }
  }

  const initiativeOrder = await Promise.all(
    slots.map((slot) =>
      slot.type === "character"
        ? createBattleParticipantFromCharacter(
            slot.character,
            battleId,
            slot.side,
            undefined,
            campaignContext,
          )
        : createBattleParticipantFromUnit(
            slot.unit,
            battleId,
            slot.side,
            slot.instanceNumber,
            uniqueRaceNames.length > 0 ? racesByName : undefined,
          ),
    ),
  );

  distributePendingScopedArtifactBonuses(initiativeOrder);

  const sortedInitiativeOrder = applyStartOfBattleAndSort(
    initiativeOrder,
    battleId,
  );

  const triggerLogEntries = sortedInitiativeOrder.triggerLogEntries;

  const updatedBattle = await prisma.battleScene.update({
    where: { id: battleId },
    data: {
      status: "active",
      startedAt: new Date(),
      initiativeOrder: slimInitiativeOrderForStorage(
        sortedInitiativeOrder.order,
      ) as unknown as Prisma.InputJsonValue,
      currentRound: 1,
      currentTurnIndex: 0,
      battleLog: triggerLogEntries as unknown as Prisma.InputJsonValue,
    },
  });

  debugBattleSync("battle started and saved", {
    campaignId,
    battleId,
    snapshot: battleStateSnapshot(sortedInitiativeOrder.order, 0, 1, "active"),
    triggerLogEntries: triggerLogEntries.length,
    battleLogCount: triggerLogEntries.length,
  });

  if (process.env.PUSHER_APP_ID) {
    const channel = battleChannelName(battleId);

    debugBattleSync("trigger battle-started", {
      channel,
      event: "battle-started",
    });
    void pusherServer
      .trigger(channel, "battle-started", preparePusherPayload(updatedBattle))
      .catch((err) => console.error("Pusher trigger failed:", err));
  }

  return NextResponse.json(stripStateBeforeForClient(updatedBattle));
}

/**
 * Застосовує start-of-battle ефекти + тригери, рахує ініціативу і сортує.
 * Повертає sorted initiativeOrder + battle-log записи від тригерів.
 */
function applyStartOfBattleAndSort(
  initiativeOrder: BattleParticipant[],
  battleId: string,
): { order: BattleParticipant[]; triggerLogEntries: BattleAction[] } {
  const updatedInitiativeOrder = initiativeOrder.map((participant) =>
    applyStartOfBattleEffects(participant, 1, initiativeOrder),
  );

  const {
    updatedParticipants: afterOnBattleStart,
    messages: onBattleStartMessages,
  } = executeOnBattleStartEffectsForAll(updatedInitiativeOrder, 1);

  const {
    updatedParticipants: afterStartOfRound,
    messages: startOfRoundMessages,
  } = executeStartOfRoundTriggers(afterOnBattleStart, 1);

  const allTriggerMessages = [
    ...onBattleStartMessages,
    ...startOfRoundMessages,
  ].filter(Boolean);

  const withCalculatedInitiative = afterStartOfRound.map((participant) => {
    const calculatedInitiative = calculateInitiative(participant);

    return {
      ...participant,
      abilities: {
        ...participant.abilities,
        initiative: calculatedInitiative,
      },
    };
  });

  const order = sortByInitiative(withCalculatedInitiative);

  const triggerLogEntries: BattleAction[] = [];

  if (allTriggerMessages.length > 0) {
    triggerLogEntries.push({
      id: `triggers-start-${Date.now()}`,
      battleId,
      round: 1,
      actionIndex: 0,
      timestamp: new Date(),
      actorId: "system",
      actorName: "Система",
      actorSide: "ally",
      actionType: "ability",
      targets: [],
      actionDetails: { triggeredAbilities: [] },
      resultText: `Тригери початку бою: ${allTriggerMessages.join("; ")}`,
      hpChanges: [],
      isCancelled: false,
      stateBefore: undefined,
    });
  }

  return { order, triggerLogEntries };
}
