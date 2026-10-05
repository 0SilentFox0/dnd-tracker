import type { Spell } from "@prisma/client";

import type { SpellRequestData } from "./cast-spell-schema";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { processSpell } from "@/lib/utils/battle/spell";
import { appendSummonedUnitToInitiativeEnd } from "@/lib/utils/battle/spell/append-summoned-unit";
import { mapDbSpellToBattleSpell } from "@/lib/utils/battle/spell/map-db-spell";
import { BattleAccessError, battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";
import { assertSpellRolls } from "@/lib/utils/battle/validation/dice-checks";

export interface SpellMutationDeps {
  loadSpell(spellId: string): Promise<Spell | null>;
  summon: typeof appendSummonedUnitToInitiativeEnd;
}

const defaultDeps: SpellMutationDeps = {
  loadSpell: (id) => prisma.spell.findUnique({ where: { id } }),
  summon: appendSummonedUnitToInitiativeEnd,
};

export function createSpellMutation(deps: SpellMutationDeps = defaultDeps) {
  return async (ctx: BattleMutationContext, data: SpellRequestData): Promise<MutationResult> => {
    const order = ctx.participants;

    const caster = order.find((p) => p.basicInfo.id === data.casterId);

    if (!caster) throw new BattleAccessError(404, "Кастера немає в бою");

    const current = order[ctx.scene.turnIndex];

    const canCast =
      ctx.isDM || (current?.basicInfo.id === caster.basicInfo.id && caster.basicInfo.controlledBy === ctx.userId);

    if (!canCast) throw new BattleAccessError(403, "Заклинання може кастувати лише DM або контролер поточного ходу");

    if (caster.combatStats.status !== "active") {
      throw new BattleRuleError("participant_dead", "Кастер непритомний або мертвий");
    }

    if (!ctx.isDM && !caster.spellcasting.knownSpells.includes(data.spellId)) {
      throw new BattleRuleError("action_rejected", "Кастер не знає цього заклинання");
    }

    const spellRow = await deps.loadSpell(data.spellId);

    if (!spellRow || spellRow.campaignId !== ctx.scene.campaignId) {
      throw new BattleAccessError(404, "Заклинання не знайдено");
    }

    if (!data.preview) {
      const isBonus = spellRow.castingTime?.toLowerCase().includes("bonus") ?? false;

      if (isBonus ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction) {
        throw new BattleRuleError("action_used", isBonus ? "Бонусну дію вже використано" : "Дію вже використано");
      }
    }

    assertSpellRolls(spellRow, data.damageRolls, data.targetIds.length);

    const result = processSpell({
      caster,
      spell: mapDbSpellToBattleSpell(spellRow),
      targetIds: data.targetIds,
      allParticipants: order,
      currentRound: ctx.scene.round,
      battleId: ctx.scene.id,
      damageRolls: data.damageRolls,
      savingThrows: data.savingThrows,
      additionalRollResult: data.additionalRollResult,
      hitRoll: data.hitRoll,
      isDMCast: ctx.isDM,
    });

    if (data.preview) {
      return {
        participants: order,
        pending: ctx.pending,
        events: [],
        response: { preview: true, battleAction: { ...result.battleAction, stateBefore: undefined } },
      };
    }

    const updatedById = new Map(
      (result.allParticipantsUpdated ?? [result.casterUpdated, ...result.targetsUpdated]).map((p) => [p.basicInfo.id, p]),
    );

    let nextOrder = order.map((p) => updatedById.get(p.basicInfo.id) ?? p);

    let action = result.battleAction;

    const summonUnitId = spellRow.summonUnitId?.trim() || null;

    if (result.success && action.actionDetails?.hitCheckMiss !== true && summonUnitId) {
      const { finalOrder, summoned } = await deps.summon({
        campaignId: ctx.scene.campaignId,
        battleId: ctx.scene.id,
        summonUnitId,
        casterSide: caster.basicInfo.side === "enemy" ? ParticipantSide.ENEMY : ParticipantSide.ALLY,
        orderAfterSpell: nextOrder,
      });

      if (summoned) {
        nextOrder = finalOrder;
        action = {
          ...action,
          targets: [...action.targets, { participantId: summoned.basicInfo.id, participantName: summoned.basicInfo.name }],
          actionDetails: {
            ...action.actionDetails,
            summonedUnitTemplateId: summoned.basicInfo.sourceId,
            summonedParticipantId: summoned.basicInfo.id,
          },
          resultText: `${action.resultText} Прикликано: ${summoned.basicInfo.name}.`,
        };
      }
    }

    return { participants: nextOrder, pending: ctx.pending, events: [battleActionToEvent(action)] };
  };
}
