import type { Spell } from "@prisma/client";

import type { SpellRequestData } from "./cast-spell-schema";

import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { isActive } from "@/lib/utils/abilities/engine/participants";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { castSpell } from "@/lib/utils/battle/spell";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import { toCastableSpell } from "@/lib/utils/battle/spell/to-castable";
import { BattleAccessError, battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { assertNotPanicking } from "@/lib/utils/battle/turn";
import { assertSpellRolls } from "@/lib/utils/battle/validation/dice-checks";
import { rollDiceList } from "@/lib/utils/common/dice";

export interface SpellMutationDeps extends SummonDeps {
  loadSpell(spellId: string): Promise<Spell | null>;
}

const defaultDeps: SpellMutationDeps = {
  loadSpell: (id) => prisma.spell.findUnique({ where: { id } }),
  loadPool: getCachedSummonPool,
};

export function createSpellMutation(deps: SpellMutationDeps = defaultDeps) {
  return async (ctx: BattleMutationContext, data: SpellRequestData): Promise<MutationResult> => {
    const order = ctx.participants;

    const caster = order.find((p) => p.basicInfo.id === data.casterId);

    if (!caster) throw new BattleAccessError(404, "Кастера немає в бою");

    const current = order[ctx.scene.turnIndex];

    const canCast = ctx.isDM || (current?.basicInfo.id === caster.basicInfo.id && caster.basicInfo.controlledBy === ctx.userId);

    if (!canCast) throw new BattleAccessError(403, "Заклинання може кастувати лише DM або контролер поточного ходу");

    if (!isActive(caster)) throw new BattleRuleError("participant_dead", "Кастер непритомний або мертвий");

    if (!ctx.isDM && !caster.spellcasting.knownSpells.includes(data.spellId)) {
      throw new BattleRuleError("action_rejected", "Кастер не знає цього заклинання");
    }

    const spellRow = await deps.loadSpell(data.spellId);

    if (!spellRow || spellRow.campaignId !== ctx.scene.campaignId) throw new BattleAccessError(404, "Заклинання не знайдено");

    const spell = toCastableSpell(spellRow);

    const { definition } = spell;

    if (!data.preview) {
      assertNotPanicking(ctx.scene.pendingMoraleCheck, caster.basicInfo.id);

      const isBonus = definition.cost === "bonusAction";

      if (isBonus ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction) {
        throw new BattleRuleError("action_used", isBonus ? "Бонусну дію вже використано" : "Дію вже використано");
      }
    }

    if (caster.battleData.activeEffects.some((e) => e.effects.some((d) => d.type === "disable_spell_casting"))) {
      throw new BattleRuleError("action_rejected", "Кастер не може чаклувати");
    }

    const resolution = resolveSpellTargets(order, caster, spell, definition.targeting, data.targetIds);

    if (!resolution.ok) throw new BattleRuleError("invalid_target", resolution.error);

    const rng = ctx.rng ?? Math.random;

    const expected = casterSpellDice(caster, { dice: definition.dice, groupId: spell.groupId });

    // прев'ю без кидків: сервер кидає сам, щоб показати орієнтовний результат
    const diceRolls = data.preview && data.diceRolls.length === 0 ? rollDiceList(`${expected.count}d${expected.sides}`, rng) : data.diceRolls;

    assertSpellRolls(expected, diceRolls);

    // клієнтські рятівні кидки приймаються лише від DM або за цілі, якими керує користувач; решту кидає сервер
    const trusted = (data.saveRolls ?? []).filter((s) => ctx.isDM || order.find((p) => p.basicInfo.id === s.participantId)?.basicInfo.controlledBy === ctx.userId);

    const serverRolled = definition.resolution.kind === "save" ? resolution.targetIds.filter((id) => !trusted.some((s) => s.participantId === id)) : [];

    const result = castSpell({
      caster,
      spell,
      targetIds: resolution.targetIds,
      allParticipants: order,
      currentRound: ctx.scene.round,
      battleId: ctx.scene.id,
      diceRolls,
      saveRolls: trusted,
      isDMCast: ctx.isDM,
      rng,
    });

    if (!result.success) throw new BattleRuleError("action_rejected", "Немає вільного слота для цього заклинання");

    if (serverRolled.length > 0) {
      result.battleAction.resultText = [result.battleAction.resultText, `🎲 рятівні кидки кинув сервер: ${serverRolled.map((id) => order.find((p) => p.basicInfo.id === id)?.basicInfo.name ?? id).join(", ")}`].join(" | ");
    }

    if (data.preview) {
      return {
        participants: order,
        pending: ctx.pending,
        events: [],
        response: { preview: true, battleAction: { ...result.battleAction, stateBefore: undefined } },
      };
    }

    const summoned = await applyAbilitySummons(result.summons, result.allParticipantsUpdated, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng, deps });

    const action = summoned.messages.length > 0 ? { ...result.battleAction, resultText: [result.battleAction.resultText, ...summoned.messages].join(" | ") } : result.battleAction;

    return { participants: summoned.order, pending: ctx.pending, events: [battleActionToEvent(action)] };
  };
}
