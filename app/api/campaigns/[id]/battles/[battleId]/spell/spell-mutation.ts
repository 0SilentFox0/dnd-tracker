import type { Spell } from "@prisma/client";

import type { SpellRequestData } from "./cast-spell-schema";

import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { canActNow, controls } from "@/lib/utils/battle/common/control";
import { applyTerrain } from "@/lib/utils/battle/grid/terrain";
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

    if (!canActNow(ctx, caster, current)) throw new BattleAccessError(403, "Заклинання може кастувати лише DM або контролер поточного ходу");

    if (!isActive(caster)) throw new BattleRuleError("participant_dead", "Кастер непритомний або мертвий");

    // вільний каст DM (швидкі дії): будь-яке закляття без слота; хід героя під керуванням DM — за правилами героя
    const free = ctx.isDM && data.free === true;

    if (!free && !caster.spellcasting.knownSpells.includes(data.spellId)) {
      throw new BattleRuleError("action_rejected", "Кастер не знає цього заклинання");
    }

    const spellRow = await deps.loadSpell(data.spellId);

    if (!spellRow || spellRow.campaignId !== ctx.scene.campaignId) throw new BattleAccessError(404, "Заклинання не знайдено");

    const spell = toCastableSpell(spellRow);

    const { definition } = spell;

    if (!data.preview) {
      assertNotPanicking(ctx.scene.pendingMoraleCheck, caster.basicInfo.id);

      const isBonus = definition.cost === "bonusAction";

      // атака й закляття за дію ділять одну дію ходу; вільний каст DM її не витрачає
      if (!free && (isBonus ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction)) {
        throw new BattleRuleError("action_used", isBonus ? API_ERRORS.BONUS_ACTION_USED : API_ERRORS.ACTION_USED);
      }
    }

    if (caster.battleData.activeEffects.some((e) => e.effects.some((d) => d.type === "disable_spell_casting"))) {
      throw new BattleRuleError("action_rejected", "Кастер не може чаклувати");
    }

    const { targeting } = definition;

    const resolution = resolveSpellTargets(order, caster, spell, targeting, data.targetIds, { map: ctx.meta.map, targetCell: data.targetCell });

    if (!resolution.ok) throw new BattleRuleError("invalid_target", resolution.error);

    const rng = ctx.rng ?? Math.random;

    const expected = casterSpellDice(caster, { dice: definition.dice, groupId: spell.groupId });

    // прев'ю без кидків: сервер кидає сам, щоб показати орієнтовний результат
    const diceRolls = data.preview && data.diceRolls.length === 0 ? rollDiceList(`${expected.count}d${expected.sides}`, rng) : data.diceRolls;

    assertSpellRolls(expected, diceRolls);

    // клієнтські рятівні кидки приймаються лише від DM або за цілі, якими керує користувач; решту кидає сервер
    const sent = data.saveRolls ?? [];

    const trusted = sent.filter((s) => controls(ctx, order.find((p) => p.basicInfo.id === s.participantId)));

    const serverRolled = sent.filter((s) => !trusted.includes(s)).map((s) => s.participantId);

    const result = castSpell({
      caster,
      spell,
      targetIds: resolution.targetIds,
      allParticipants: order,
      currentRound: ctx.scene.round,
      battleId: ctx.scene.id,
      diceRolls,
      saveRolls: trusted,
      isDMCast: free,
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
        response: { preview: true, battleAction: { ...result.battleAction, stateBefore: undefined }, ...(resolution.cells && { cells: resolution.cells }) },
      };
    }

    const summoned = await applyAbilitySummons(result.summons, result.allParticipantsUpdated, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng, deps });

    const action = summoned.messages.length > 0 ? { ...result.battleAction, resultText: [result.battleAction.resultText, ...summoned.messages].join(" | ") } : result.battleAction;

    const zone = targeting.kind === "template" ? targeting.zone : undefined;

    const map = ctx.meta.map;

    const hazard = zone && map && resolution.cells
      ? applyTerrain(map, resolution.cells, {
          kind: "hazard",
          label: zone.label ?? spell.name,
          untilRound: ctx.scene.round + zone.rounds - 1,
          ...(result.spellDamage && { damage: result.spellDamage }),
        })
      : null;

    return { participants: summoned.order, pending: ctx.pending, events: [battleActionToEvent(action)], ...(hazard && { scene: { map: hazard } }) };
  };
}
