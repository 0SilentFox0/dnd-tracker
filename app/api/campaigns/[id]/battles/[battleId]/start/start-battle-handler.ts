/**
 * Бізнес-логіка POST /start — винесена з route.ts (CODE_AUDIT 1.5).
 *
 * route.ts: тонка (auth + battle fetch + status check) → executeStartBattle
 *
 * Тут: завантаження учасників, побудова slot-ів, паралельне створення
 * BattleParticipant, ефекти/тригери на старт бою, розрахунок ініціативи,
 * сортування. Запис і Pusher — у runBattleMutation.
 */


import { buildCampaignContextForStart } from "./start-build-context";

import { ParticipantSide, ParticipantSourceType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import {
  calculateInitiative,
  sortByInitiative,
} from "@/lib/utils/battle/battle-start";
import {
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle/participant";
import type { BattleAction, BattleParticipant, BattlePreparationParticipant } from "@/types/battle";

export async function buildStartOrder(
  battleId: string,
  campaignId: string,
  setup: BattlePreparationParticipant[],
): Promise<{ order: BattleParticipant[]; triggerLogEntries: BattleAction[] }> {
  const participantsRaw = setup as Array<{
    id: string;
    type: ParticipantSourceTypeValue;
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
      if (p.type === ParticipantSourceType.CHARACTER) acc.charIds.push(p.id);
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

  const { campaignContext, racesById } = await buildCampaignContextForStart(campaignId, characters, units);

  type ParticipantSlot =
    | { type: typeof ParticipantSourceType.CHARACTER; character: (typeof characters)[number]; side: ParticipantSide }
    | {
        type: typeof ParticipantSourceType.UNIT;
        unit: (typeof units)[number];
        side: ParticipantSide;
        instanceNumber: number;
      };

  const slots: ParticipantSlot[] = [];

  for (const participant of participants) {
    if (participant.type === ParticipantSourceType.CHARACTER) {
      const character = characterMap.get(participant.id);

      if (character) {
        slots.push({ type: ParticipantSourceType.CHARACTER, character, side: participant.side });
      }
    } else if (participant.type === ParticipantSourceType.UNIT) {
      const unit = unitMap.get(participant.id);

      if (unit) {
        const quantity = participant.quantity || 1;

        for (let i = 0; i < quantity; i++) {
          slots.push({
            type: ParticipantSourceType.UNIT,
            unit,
            side: participant.side,
            instanceNumber: i + 1,
          });
        }
      }
    }
  }

  const built = await Promise.all(
    slots.map((slot) =>
      slot.type === ParticipantSourceType.CHARACTER
        ? createBattleParticipantFromCharacter(
            slot.character,
            battleId,
            slot.side,
            undefined,
            campaignContext,
          )
        : createBattleParticipantFromUnit(slot.unit, battleId, slot.side, slot.instanceNumber, racesById),
    ),
  );

  const initiativeOrder = applyBakedAuras(built, new Set(built.map((p) => p.basicInfo.id)));

  const sortedInitiativeOrder = applyStartOfBattleAndSort(
    initiativeOrder,
    battleId,
  );

  return {
    order: sortedInitiativeOrder.order,
    triggerLogEntries: sortedInitiativeOrder.triggerLogEntries,
  };
}

function applyStartOfBattleAndSort(
  initiativeOrder: BattleParticipant[],
  battleId: string,
): { order: BattleParticipant[]; triggerLogEntries: BattleAction[] } {
  const ctx = { round: 1, rng: Math.random };

  const battleStart = runAbilities(initiativeOrder, { type: "battleStart" }, ctx);

  const roundStart = runAbilities(battleStart.participants, { type: "roundStart" }, ctx);

  const afterStartOfRound = roundStart.participants;

  const allTriggerMessages = [...battleStart.messages, ...roundStart.messages];

  const withCalculatedInitiative = afterStartOfRound.map((participant) => {
    const calculatedInitiative = calculateInitiative(participant, afterStartOfRound);

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
