import type { Spell } from "@prisma/client";

import type { SpellRequestData } from "./cast-spell-schema";

import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { findParticipant, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { cooldownLeft, poolLeft, recordUse, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { lairAbilities, lairBlocker, spendLair } from "@/lib/utils/battle/actions/lair";
import { legendaryAbilities, legendaryBlocker, legendaryCostOf, spendLegendary } from "@/lib/utils/battle/actions/legendary-options";
import { reactionBlocker } from "@/lib/utils/battle/actions/reaction";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import { requireActor } from "@/lib/utils/battle/common/control";
import { dropConcentration } from "@/lib/utils/battle/concentration";
import { spellDiceRolls } from "@/lib/utils/battle/dice-record";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { castSpell } from "@/lib/utils/battle/spell";
import { flatEffects, isDamageEffect } from "@/lib/utils/battle/spell/cast/state";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import { prepareLongCast } from "@/lib/utils/battle/spell/long-cast";
import { splitSaveRolls } from "@/lib/utils/battle/spell/save-rolls";
import { resolveChosenSlot, spellNeedsSlot, spellSlotKey } from "@/lib/utils/battle/spell/slot";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import { toCastableSpell } from "@/lib/utils/battle/spell/to-castable";
import { spellZoneHazard } from "@/lib/utils/battle/spell/zone-hazard";
import { systemEvent } from "@/lib/utils/battle/store";
import { BattleAccessError, battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { assertCanAct } from "@/lib/utils/battle/turn";
import { assertSpellRolls } from "@/lib/utils/battle/validation/dice-checks";
import { rollDiceList } from "@/lib/utils/common/dice";

const healsByDefinition = (effects: Parameters<typeof flatEffects>[0]) => {
  const flat = flatEffects(effects);

  return flat.some((e) => e.kind === "heal" || e.kind === "hot") && !flat.some(isDamageEffect);
};

export interface SpellMutationDeps extends SummonDeps {
  loadSpell(spellId: string): Promise<Spell | null>;
}

const defaultDeps: SpellMutationDeps = {
  loadSpell: (id) => prisma.spell.findUnique({ where: { id } }),
  loadPool: getCachedSummonPool,
};

export function createSpellMutation(deps: SpellMutationDeps = defaultDeps, options: { serverRolls?: boolean } = {}) {
  return async (ctx: BattleMutationContext, data: SpellRequestData): Promise<MutationResult> => {
    let order = ctx.participants;

    const spellRow = await deps.loadSpell(data.spellId);

    if (!spellRow || spellRow.campaignId !== ctx.scene.campaignId) throw new BattleAccessError(404, "Заклинання не знайдено");

    const spell = toCastableSpell(spellRow);

    const { definition } = spell;

    if (definition.executionMode === "manual" && !data.cancelCasting) throw new BattleRuleError("action_rejected", "Налаштуйте механіку заклинання або застосуйте його вручну");

    if (data.legendaryKey && !ctx.isDM) throw new BattleAccessError(403, "Легендарні дії — лише для ДМ");

    if (data.legendaryKey && (data.free || data.slotKey)) throw new BattleRuleError("action_rejected", "Легендарний каст не потребує вільного режиму чи слота");

    let caster = requireActor(ctx, data.casterId, {
      anyTurn: definition.cost === "reaction",
      missing: "Кастера немає в бою",
      forbidden: "Заклинання може кастувати лише DM або контролер поточного ходу",
      inactive: { code: "participant_dead", message: "Кастер непритомний або мертвий" },
    });

    if (data.cancelCasting) {
      const dropped = dropConcentration(order, caster.basicInfo.id, "накладання скасовано");

      return { participants: dropped.participants, pending: ctx.pending, events: [systemEvent(ctx.scene.round, `${caster.basicInfo.name}: накладання скасовано`)] };
    }

    const legendaryAbility = data.legendaryKey ? [...legendaryAbilities(caster), ...lairAbilities(caster)].find((a) => a.key === data.legendaryKey && a.perform?.kind === "spell" && a.perform.spellId === data.spellId) : undefined;

    if (data.legendaryKey) {
      if (!legendaryAbility) throw new BattleRuleError("action_rejected", "У учасника немає такої легендарної дії заклинання");

      const blocker = legendaryAbility.limits?.lair ? lairBlocker(caster, ctx.scene.round, legendaryAbility.key) : legendaryBlocker(caster, order[ctx.scene.turnIndex], legendaryCostOf(legendaryAbility));

      if (blocker) throw new BattleRuleError("action_rejected", blocker);

      if (!withinCountLimits(caster, legendaryAbility)) throw new BattleRuleError("ability_limit", "Ліміт використань вичерпано");

      const wait = cooldownLeft(caster, legendaryAbility, ctx.scene.round);

      if (wait > 0) throw new BattleRuleError("ability_limit", `Перезарядка: ще ${wait} р.`);
    }

    // вільний каст DM (швидкі дії): будь-яке закляття без слота; хід героя під керуванням DM — за правилами героя

    const free = ctx.isDM && data.free === true;

    const spellGrants = free ? [] : (caster.spellcasting.grants ?? []).filter((g) => g.spellId === data.spellId);

    let grant = data.grantKey ? spellGrants.find((g) => g.key === data.grantKey) : undefined;

    if (data.grantKey && !grant) throw new BattleRuleError("action_rejected", "Джерело заклинання більше недоступне");

    if (!data.grantKey && data.slotKey) {
      if (!caster.spellcasting.slotSpells?.includes(data.spellId) && !spellGrants.some((g) => g.via === "slotOrGrant") && spellGrants.length > 0) throw new BattleRuleError("action_rejected", API_ERRORS.GRANT_NO_SLOT);
    } else if (!data.grantKey && spellGrants.length > 1) {
      throw new BattleRuleError("action_rejected", "Оберіть джерело заклинання");
    } else if (!data.grantKey && spellGrants.length === 1) {
      grant = spellGrants[0];
    }

    if (data.grantKey && data.slotKey) throw new BattleRuleError("action_rejected", "Оберіть слот або джерело заклинання");

    if (data.castLevel !== undefined && (!grant?.upcast || data.castLevel < (grant.castLevel ?? 0) || data.castLevel > grant.upcast.maxLevel)) throw new BattleRuleError("action_rejected", "Недозволений рівень підсилення заклинання предмета");

    if (data.castLevel !== undefined && grant?.upcast) grant = { ...grant, cost: (grant.cost ?? 1) + (data.castLevel - (grant.castLevel ?? 0)) * grant.upcast.extraCost };

    if (!free && !legendaryAbility && !grant && !caster.spellcasting.knownSpells.includes(data.spellId)) {
      throw new BattleRuleError("action_rejected", "Кастер не знає цього заклинання");
    }

    if (grant && data.slotKey) throw new BattleRuleError("action_rejected", API_ERRORS.GRANT_NO_SLOT);

    if (grant?.legendaryOnly && !legendaryAbility) throw new BattleRuleError("action_rejected", API_ERRORS.SPELL_LEGENDARY_ONLY);

    if (grant?.pool && (poolLeft(caster, grant.pool) ?? -1) < (grant.cost ?? 1)) {
      throw new BattleRuleError("action_rejected", API_ERRORS.SPELL_USES_EMPTY);
    }

    if (grant?.castLevel !== undefined && grant.castLevel < spell.level) throw new BattleRuleError("action_rejected", "Рівень джерела нижчий за рівень заклинання");

    if (!data.preview && !legendaryAbility) {
      if (definition.cost === "reaction" && !free) {
        const blocker = reactionBlocker(caster);

        if (blocker) throw new BattleRuleError("action_rejected", blocker);
      } else assertCanAct(ctx, caster.basicInfo.id, { skipMorale: free });

      const isBonus = definition.cost === "bonusAction";

      // атака й закляття за дію ділять одну дію ходу; вільний каст DM її не витрачає

      if (!free && definition.cost !== "reaction" && (isBonus ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction)) {
        throw new BattleRuleError("action_used", isBonus ? API_ERRORS.BONUS_ACTION_USED : API_ERRORS.ACTION_USED);
      }
    }

    if (hasEffectMarker(caster, "disable_spell_casting")) {
      throw new BattleRuleError("action_rejected", "Кастер не може чаклувати");
    }

    const chosen = !free && !legendaryAbility && !grant && data.slotKey && isFiveE(caster) && spellNeedsSlot(spell.level) ? resolveChosenSlot(caster, spell.level, data.slotKey) : null;

    if (chosen && !chosen.ok) throw new BattleRuleError("action_rejected", chosen.error);

    const castLevel = data.castLevel ?? grant?.castLevel ?? (chosen?.ok ? chosen.castLevel : undefined);

    if (definition.cost === "long" && !free && !data.preview) {
      if (!grant && spellNeedsSlot(spell.level) && (caster.spellcasting.spellSlots[data.slotKey ?? spellSlotKey(caster, spell.level)]?.current ?? 0) <= 0) throw new BattleRuleError("action_rejected", "Немає вільного слота для накладання");

      const prepared = prepareLongCast({ ...ctx, participants: order }, caster, spell, { grantKey: grant?.key, slotKey: data.slotKey, castLevel }, data.castingRounds);

      if (!prepared.ready) return { participants: prepared.participants, pending: ctx.pending, events: [prepared.event] };

      caster = prepared.caster;
      order = replaceParticipant(prepared.participants, caster);
    } else if (data.castingRounds !== undefined) throw new BattleRuleError("action_rejected", "Час можна зарахувати лише для тривалого накладання");

    const resolution = resolveSpellTargets(order, caster, spell, definition.targeting, data.targetIds, {
      map: ctx.meta.map,
      targetCell: data.targetCell,
      castLevel,
      upcastTargets: definition.upcastTargets,
    });

    if (!resolution.ok) throw new BattleRuleError("invalid_target", resolution.error);

    if (legendaryAbility?.condition && !evaluateCondition(legendaryAbility.condition, { owner: caster, event: { type: "action", actorId: caster.basicInfo.id, abilityKey: legendaryAbility.key, targetIds: resolution.targetIds }, participants: order, sourceId: legendaryAbility.source.id })) throw new BattleRuleError("action_rejected", "Умова вміння не виконується");

    const rng = ctx.rng ?? Math.random;

    const expected = casterSpellDice(caster, { dice: definition.dice, groupId: spell.groupId, level: spell.level, dieSides: definition.dieSides, upcastDice: definition.upcastDice, fixedDice: definition.fixedDice }, castLevel);

    // прев'ю без кидків: сервер кидає сам, щоб показати орієнтовний результат

    const diceRolls = (data.preview || options.serverRolls) && data.diceRolls.length === 0 ? rollDiceList(`${expected.count}d${expected.sides}`, rng) : data.diceRolls;

    assertSpellRolls(expected, diceRolls);

    const { trusted, serverRolled } = splitSaveRolls(ctx, order, data.saveRolls);

    const result = castSpell({
      caster,
      spell,
      targetIds: resolution.targetIds,
      allParticipants: order,
      currentRound: ctx.scene.round,
      battleId: ctx.scene.id,
      diceRolls,
      saveRolls: trusted,
      attackRolls: data.attackRolls,
      dice: expected,
      isDMCast: free,
      isLegendaryCast: !!legendaryAbility,
      grant,
      castLevel,
      ...(chosen?.ok && { slotKey: data.slotKey }),
      rng,
      map: ctx.meta.map,
      rules: ctx.meta.rules,
    });

    if (!result.success) throw new BattleRuleError("action_rejected", "Немає вільного слота для цього заклинання");

    const groups = spellDiceRolls({
      casterId: caster.basicInfo.id,
      sides: expected.sides,
      rolls: diceRolls,
      heal: healsByDefinition(definition.effects),
      saves: result.battleAction.actionDetails.savingThrows ?? [],
      presetSaveIds: new Set(trusted.map((s) => s.participantId)),
    });

    if (groups.length > 0) result.battleAction.actionDetails.diceRolls = groups;

    if (resolution.centre) result.battleAction.actionDetails.aimCell = resolution.centre;

    if (serverRolled.length > 0) {
      result.battleAction.resultText = [result.battleAction.resultText, `🎲 рятівні кидки кинув сервер: ${serverRolled.map((id) => findParticipant(order, id)?.basicInfo.name ?? id).join(", ")}`].join(" | ");
    }

    if (data.preview) {
      return {
        participants: order,
        pending: ctx.pending,
        events: [],
        response: { preview: true, battleAction: { ...result.battleAction, stateBefore: undefined }, ...(resolution.cells && { cells: resolution.cells }) },
      };
    }

    const summoned = await applyAbilitySummons(result.summons, result.allParticipantsUpdated, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng, rules: ctx.meta.rules, deps });

    if (legendaryAbility) summoned.order = updateParticipant(summoned.order, caster.basicInfo.id, (p) => {
      const used = recordUse(p, legendaryAbility.key, ctx.scene.round, legendaryAbility.limits?.pool);

      return legendaryAbility.limits?.lair ? spendLair(used, ctx.scene.round, legendaryAbility.key) : spendLegendary(used, legendaryCostOf(legendaryAbility));
    });

    if (legendaryAbility) result.battleAction.resultText = `${legendaryAbility.limits?.lair ? "🏰" : "👑"} ${legendaryAbility.name} — ${result.battleAction.resultText}`;

    const action = summoned.messages.length > 0 ? { ...result.battleAction, resultText: [result.battleAction.resultText, ...summoned.messages].join(" | ") } : result.battleAction;

    const hazard = spellZoneHazard({ map: ctx.meta.map, spell, cells: resolution.cells, round: ctx.scene.round, spellDamage: result.spellDamage, concentrationOf: result.concentration });

    return { participants: summoned.order, pending: ctx.pending, events: [battleActionToEvent(action)], ...(hazard && { scene: { map: hazard } }) };
  };
}
