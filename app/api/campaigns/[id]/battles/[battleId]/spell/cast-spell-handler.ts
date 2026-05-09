/**
 * Бізнес-логіка POST /spell — винесена з route.ts (CODE_AUDIT 1.3).
 *
 * route.ts тепер тонка: auth + battle fetch + status check + parse body
 *   → executeCastSpell(...)
 *
 * Тут: дозвіл (DM vs контролер ходу), known-spells перевірка, action-flag
 * перевірка, мапінг Spell → BattleSpell, processSpell, summon-юніт-tail,
 * запис у БД, Pusher trigger.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import type { SpellRequestData } from "./cast-spell-schema";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { logBattleTiming } from "@/lib/utils/battle/battle-timing";
import { BattleSpell, processSpell } from "@/lib/utils/battle/spell";
import { appendSummonedUnitToInitiativeEnd } from "@/lib/utils/battle/spell/append-summoned-unit";
import {
  prepareBattleLogForStorage,
  preparePusherPayload,
  slimInitiativeOrderForStorage,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface ExecuteCastSpellInput {
  campaignId: string;
  battleId: string;
  userId: string;
  isDM: boolean;
  /** initiativeOrder + currentTurnIndex + currentRound + battleLog. */
  battle: {
    initiativeOrder: unknown;
    currentTurnIndex: number;
    currentRound: number;
    battleLog: unknown;
  };
  data: SpellRequestData;
  /** Час старту запиту — для logBattleTiming. */
  t0: number;
}

export async function executeCastSpell(
  input: ExecuteCastSpellInput,
): Promise<NextResponse> {
  const { campaignId, battleId, userId, isDM, battle, data, t0 } = input;

  const initiativeOrder = battle.initiativeOrder as BattleParticipant[];

  const caster = initiativeOrder.find((p) => p.basicInfo.id === data.casterId);

  if (!caster) {
    return NextResponse.json(
      { error: "Caster not found in battle" },
      { status: 404 },
    );
  }

  const currentParticipant = initiativeOrder[battle.currentTurnIndex];

  const canCast =
    isDM ||
    (currentParticipant?.basicInfo.id === caster.basicInfo.id &&
      caster.basicInfo.controlledBy === userId);

  if (!canCast) {
    return NextResponse.json(
      { error: "Forbidden: only DM or current turn controller can cast spells" },
      { status: 403 },
    );
  }

  if (caster.combatStats.status !== "active") {
    return NextResponse.json(
      { error: "Caster is not active (unconscious or dead)" },
      { status: 400 },
    );
  }

  if (!isDM && !caster.spellcasting.knownSpells.includes(data.spellId)) {
    return NextResponse.json(
      { error: "Spell is not in caster's known spells" },
      { status: 400 },
    );
  }

  const spellData = await prisma.spell.findUnique({
    where: { id: data.spellId },
  });

  if (!spellData || spellData.campaignId !== campaignId) {
    return NextResponse.json({ error: "Spell not found" }, { status: 404 });
  }

  // Прев’ю лише рахує результат — не вимагає вільної дії / бонус-дії
  if (!data.preview) {
    const isBonusActionSpell =
      spellData.castingTime?.toLowerCase().includes("bonus") ?? false;

    if (isBonusActionSpell) {
      if (caster.actionFlags.hasUsedBonusAction) {
        return NextResponse.json(
          { error: "Caster has already used their bonus action" },
          { status: 400 },
        );
      }
    } else if (caster.actionFlags.hasUsedAction) {
      return NextResponse.json(
        { error: "Caster has already used their action" },
        { status: 400 },
      );
    }
  }

  const battleSpell = mapDbSpellToBattleSpell(spellData);

  const tSpell = Date.now();

  const spellResult = processSpell({
    caster,
    spell: battleSpell,
    targetIds: data.targetIds,
    allParticipants: initiativeOrder,
    currentRound: battle.currentRound,
    battleId,
    damageRolls: data.damageRolls,
    savingThrows: data.savingThrows,
    additionalRollResult: data.additionalRollResult,
    hitRoll: data.hitRoll,
    isDMCast: isDM,
  });

  logBattleTiming("spell: processSpell (перерахунок шкоди)", tSpell, {
    spellId: data.spellId,
    targetCount: data.targetIds.length,
  });

  const updatedInitiativeOrder = initiativeOrder.map((p) => {
    if (p.basicInfo.id === caster.basicInfo.id) {
      return spellResult.casterUpdated;
    }

    const updatedTarget = spellResult.targetsUpdated.find(
      (t) => t.basicInfo.id === p.basicInfo.id,
    );

    return updatedTarget ?? p;
  });

  const hitCheckMiss =
    spellResult.battleAction.actionDetails?.hitCheckMiss === true;

  const summonUnitId = spellData.summonUnitId?.trim() || null;

  const canSummonFromSpell =
    !data.preview &&
    spellResult.success &&
    !hitCheckMiss &&
    summonUnitId != null &&
    summonUnitId.length > 0;

  let initiativeOrderToPersist = updatedInitiativeOrder;

  let battleActionForLog = spellResult.battleAction;

  if (canSummonFromSpell && summonUnitId) {
    const casterSide =
      caster.basicInfo.side === "enemy"
        ? ParticipantSide.ENEMY
        : ParticipantSide.ALLY;

    const { finalOrder, summoned } = await appendSummonedUnitToInitiativeEnd({
      campaignId,
      battleId,
      summonUnitId,
      casterSide,
      orderAfterSpell: updatedInitiativeOrder,
    });

    if (summoned) {
      initiativeOrderToPersist = finalOrder;
      battleActionForLog = {
        ...spellResult.battleAction,
        targets: [
          ...spellResult.battleAction.targets,
          {
            participantId: summoned.basicInfo.id,
            participantName: summoned.basicInfo.name,
          },
        ],
        actionDetails: {
          ...spellResult.battleAction.actionDetails,
          summonedUnitTemplateId: summoned.basicInfo.sourceId,
          summonedParticipantId: summoned.basicInfo.id,
        },
        resultText: `${spellResult.battleAction.resultText} Прикликано: ${summoned.basicInfo.name}.`,
      };
    }
  }

  const battleLog = (battle.battleLog as BattleAction[]) || [];

  const actionIndex = battleLog.length;

  const stateBefore = {
    initiativeOrder: structuredClone(initiativeOrder),
    currentTurnIndex: battle.currentTurnIndex,
    currentRound: battle.currentRound,
  };

  const battleAction: BattleAction = {
    ...battleActionForLog,
    actionIndex,
    stateBefore,
  };

  if (data.preview) {
    return NextResponse.json({
      preview: true,
      battleAction: {
        ...battleAction,
        stateBefore: undefined,
      },
    });
  }

  const updatedBattle = await prisma.battleScene.update({
    where: { id: battleId },
    data: {
      initiativeOrder: slimInitiativeOrderForStorage(
        initiativeOrderToPersist,
      ) as unknown as Prisma.InputJsonValue,
      battleLog: prepareBattleLogForStorage([
        ...battleLog,
        battleAction,
      ]) as unknown as Prisma.InputJsonValue,
    },
  });

  if (process.env.PUSHER_APP_ID) {
    const { pusherServer, battleChannelName } = await import("@/lib/pusher");

    void pusherServer
      .trigger(
        battleChannelName(battleId),
        "battle-updated",
        preparePusherPayload(updatedBattle),
      )
      .catch((err) => console.error("Pusher trigger failed:", err));
  }

  logBattleTiming("spell: total", t0, { targetCount: data.targetIds.length });

  return NextResponse.json(stripStateBeforeForClient(updatedBattle));
}

/** Перетворює DB Spell row на runtime BattleSpell для processSpell. */
function mapDbSpellToBattleSpell(
  spellData: Prisma.SpellGetPayload<object>,
): BattleSpell {
  return {
    id: spellData.id,
    name: spellData.name,
    level: spellData.level,
    type: spellData.type as "target" | "aoe" | "no_target",
    target: spellData.target as "enemies" | "allies" | "all" | undefined,
    damageType: spellData.damageType as "damage" | "heal" | "all",
    damageElement: spellData.damageElement,
    groupId: spellData.groupId ?? null,
    damageModifier: spellData.damageModifier,
    healModifier: spellData.healModifier,
    diceCount: spellData.diceCount,
    diceType: spellData.diceType,
    savingThrow: spellData.savingThrow as
      | { ability: string; onSuccess: "half" | "none"; dc?: number }
      | null,
    hitCheck:
      (spellData.hitCheck as { ability: string; dc: number } | null) ??
      undefined,
    description: spellData.description ?? "",
    duration: spellData.duration,
    castingTime: spellData.castingTime,
    effects: Array.isArray(spellData.effects)
      ? (spellData.effects as string[])
      : undefined,
    effectDetails:
      (spellData.effectDetails as BattleSpell["effectDetails"]) ?? undefined,
    icon: spellData.icon ?? undefined,
  };
}
