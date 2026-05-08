import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { buildCampaignContextForStart } from "./start-build-context";
import { battleStateSnapshot, debugBattleSync } from "./start-helpers";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
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
import type { BattleAction } from "@/types/battle";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> }
) {
  try {
    const { id, battleId } = await params;

    debugBattleSync("request received", { campaignId: id, battleId });

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    debugBattleSync("loaded battle to start", {
      campaignId: id,
      battleId,
      status: battle.status,
      participantsRawCount:
        ((battle.participants as unknown as Array<unknown>) ?? []).length,
    });

    const participantsRaw = battle.participants as Array<{
      id: string;
      type: "character" | "unit";
      side: string;
      quantity?: number;
    }>;

    const participants = participantsRaw.map((p) => ({
      ...p,
      side: (p.side === ParticipantSide.ALLY ? ParticipantSide.ALLY : ParticipantSide.ENEMY) as ParticipantSide,
    }));

    const { charIds, unitIds } = participants.reduce(
      (acc, p) => {
        if (p.type === "character") acc.charIds.push(p.id);
        else acc.unitIds.push(p.id);

        return acc;
      },
      { charIds: [] as string[], unitIds: [] as string[] },
    );

    // Batch load characters and units
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
      await buildCampaignContextForStart(id, characters, units);

    // Build participant slots and create in parallel
    type ParticipantSlot =
      | { type: "character"; character: (typeof characters)[number]; side: ParticipantSide }
      | { type: "unit"; unit: (typeof units)[number]; side: ParticipantSide; instanceNumber: number };

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

    // Застосовуємо початкові ефекти для всіх учасників (start_of_battle тригери)
    const updatedInitiativeOrder = initiativeOrder.map((participant) => {
      return applyStartOfBattleEffects(participant, 1, initiativeOrder);
    });

    // Скіли з тригером onBattleStart (наприклад +2 ініціатива, бонус на перший удар)
    const { updatedParticipants: afterOnBattleStart, messages: onBattleStartMessages } =
      executeOnBattleStartEffectsForAll(updatedInitiativeOrder, 1);

    // Тригери початку раунду (раунд 1) — щоб бонуси ініціативи з startRound скілів потрапили до розрахунку
    const { updatedParticipants: afterStartOfRound, messages: startOfRoundMessages } =
      executeStartOfRoundTriggers(afterOnBattleStart, 1);

    // Збираємо всі повідомлення тригерів для логу бою
    const allTriggerMessages = [
      ...onBattleStartMessages,
      ...startOfRoundMessages,
    ].filter(Boolean);

    // Розраховуємо ініціативу з урахуванням спеціальних правил та ефектів
    const initiativeOrderWithCalculatedInitiative = afterStartOfRound.map(
      (participant) => {
        const calculatedInitiative = calculateInitiative(participant);

        return {
          ...participant,
          abilities: {
            ...participant.abilities,
            initiative: calculatedInitiative,
          },
        };
      }
    );

    // Сортуємо за ініціативою (initiative → baseInitiative → dexterity)
    const sortedInitiativeOrder = sortByInitiative(initiativeOrderWithCalculatedInitiative);

    // Записи логу бою: спрацювання тригерів на початку бою
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

    // Оновлюємо бій
    const updatedBattle = await prisma.battleScene.update({
      where: { id: battleId },
      data: {
        status: "active",
        startedAt: new Date(),
        initiativeOrder: slimInitiativeOrderForStorage(
          sortedInitiativeOrder,
        ) as unknown as Prisma.InputJsonValue,
        currentRound: 1,
        currentTurnIndex: 0,
        battleLog: triggerLogEntries as unknown as Prisma.InputJsonValue,
      },
    });

    debugBattleSync("battle started and saved", {
      campaignId: id,
      battleId,
      snapshot: battleStateSnapshot(sortedInitiativeOrder, 0, 1, "active"),
      triggerLogEntries: triggerLogEntries.length,
      battleLogCount: triggerLogEntries.length,
    });

    // Відправляємо real-time оновлення через Pusher
    if (process.env.PUSHER_APP_ID) {
      const { pusherServer, battleChannelName } = await import("@/lib/pusher");

      const channel = battleChannelName(battleId);

      debugBattleSync("trigger battle-started", {
        channel,
        event: "battle-started",
      });
      void pusherServer
        .trigger(
          channel,
          "battle-started",
          preparePusherPayload(updatedBattle),
        )
        .catch((err) => console.error("Pusher trigger failed:", err));
    }

    return NextResponse.json(stripStateBeforeForClient(updatedBattle));
  } catch (error) {
    console.error("Error starting battle:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
