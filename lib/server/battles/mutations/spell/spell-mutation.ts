import type { Spell } from "@prisma/client";

import type { SpellRequestData } from "./cast-spell-schema";

import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { findParticipant, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { recordUse } from "@/lib/utils/abilities/engine/core/usage";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { spendLair } from "@/lib/utils/battle/actions/lair";
import { legendaryCostOf, spendLegendary } from "@/lib/utils/battle/actions/legendary-options";
import { reactionBlocker } from "@/lib/utils/battle/actions/reaction";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import { requireActor } from "@/lib/utils/battle/common/control";
import { dropConcentration } from "@/lib/utils/battle/concentration";
import { runWithCritChoice } from "@/lib/utils/battle/crit-choice/run-with-crit-choice";
import type { CritResume } from "@/lib/utils/battle/crit-choice/types";
import { spellDiceRolls } from "@/lib/utils/battle/dice-record";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { armorPenalty } from "@/lib/utils/battle/proficiency";
import { castSpell } from "@/lib/utils/battle/spell";
import { flatEffects, inputDiceOf, isDamageEffect, optionInRange } from "@/lib/utils/battle/spell/cast/state";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import { peekInlineGrant, withInlineDefinition } from "@/lib/utils/battle/spell/inline-grant";
import { prepareLongCast } from "@/lib/utils/battle/spell/long-cast";
import { spellSaveDc } from "@/lib/utils/battle/spell/power";
import { resolveSpellSource } from "@/lib/utils/battle/spell/resolve-source";
import { splitSaveRolls } from "@/lib/utils/battle/spell/save-rolls";
import { resolveChosenSlot, spellNeedsSlot, spellSlotKey } from "@/lib/utils/battle/spell/slot";
import { pacifiedBlock, resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import { toCastableSpell } from "@/lib/utils/battle/spell/to-castable";
import { spellTerrainEffects, spellZoneHazard } from "@/lib/utils/battle/spell/zone-hazard";
import { systemEvent } from "@/lib/utils/battle/store";
import { BattleAccessError, battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { objectsNear } from "@/lib/utils/battle/summon/objects-near";
import { applyTransforms } from "@/lib/utils/battle/transform/apply-transforms";
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
  return async (ctx: BattleMutationContext, data: SpellRequestData, resume?: CritResume): Promise<MutationResult> => {
    let order = ctx.participants;

    const spellRow = await deps.loadSpell(data.spellId);

    if (!spellRow || spellRow.campaignId !== ctx.scene.campaignId) throw new BattleAccessError(404, API_ERRORS.BATTLE_SPELL_NOT_FOUND);

    const inlineGrant = peekInlineGrant(order, data.casterId, data);

    const base = toCastableSpell(spellRow);

    const spell = inlineGrant ? withInlineDefinition(base, inlineGrant) : base;

    const { definition } = spell;

    if (definition.executionMode === "manual" && !data.cancelCasting) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_SPELL_CONFIGURE_OR_MANUAL);

    if (!data.cancelCasting && !optionInRange(definition.effects, data.optionIndex)) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_SPELL_OPTION_REQUIRED);

    if (data.legendaryKey && !ctx.isDM) throw new BattleAccessError(403, API_ERRORS.BATTLE_LEGENDARY_DM_ONLY);

    if (data.legendaryKey && (data.free || data.slotKey)) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_LEGENDARY_CAST_NO_SLOT);

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

    const { legendaryAbility, free, grant } = resolveSpellSource(ctx, caster, spell, data);

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
      throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_CASTER_CANNOT_CAST);
    }

    if (armorPenalty(caster)) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_CASTER_ARMOR_NOT_PROFICIENT);

    const chosen = !free && !legendaryAbility && !grant && data.slotKey && isFiveE(caster) && spellNeedsSlot(spell.level) ? resolveChosenSlot(caster, spell.level, data.slotKey) : null;

    if (chosen && !chosen.ok) throw new BattleRuleError("action_rejected", chosen.error);

    const castLevel = (grant ? data.castLevel : undefined) ?? grant?.castLevel ?? (chosen?.ok ? chosen.castLevel : undefined);

    if (definition.cost === "long" && !free && !data.preview) {
      if (!grant && spellNeedsSlot(spell.level) && (caster.spellcasting.spellSlots[data.slotKey ?? spellSlotKey(caster, spell.level)]?.current ?? 0) <= 0) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_FREE_SLOT_TO_CAST);

      const prepared = prepareLongCast({ ...ctx, participants: order }, caster, spell, { grantKey: grant?.key, slotKey: data.slotKey, castLevel }, data.castingRounds);

      if (!prepared.ready) return { participants: prepared.participants, pending: ctx.pending, events: [prepared.event] };

      caster = prepared.caster;
      order = replaceParticipant(prepared.participants, caster);
    } else if (data.castingRounds !== undefined) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_TIME_ONLY_DURATION_CAST);

    const pacified = pacifiedBlock(order, caster, definition.targeting, data.targetIds);

    if (pacified) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_CASTER_PACIFIED, pacified);

    const resolution = resolveSpellTargets(order, caster, spell, definition.targeting, data.targetIds, {
      map: ctx.meta.map,
      targetCell: data.targetCell,
      castLevel,
      upcastTargets: definition.upcastTargets,
    });

    if (!resolution.ok) throw new BattleRuleError("invalid_target", resolution.error);

    if (definition.perObjectFeet && !data.preview) {
      const reach = definition.perObjectFeet;

      const orphan = resolution.targetIds.some((id) => { const t = findParticipant(order, id);

 return !t || objectsNear(order, caster.basicInfo.id, spell.id, t, reach).length === 0; });

      if (orphan) throw new BattleRuleError("invalid_target", API_ERRORS.BATTLE_SPELL_NO_OBJECT_NEAR);
    }

    const pacifiedHit = pacifiedBlock(order, caster, { kind: "self" }, resolution.targetIds);

    if (pacifiedHit) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_CASTER_PACIFIED, pacifiedHit);

    if (legendaryAbility?.condition && !evaluateCondition(legendaryAbility.condition, { owner: caster, event: { type: "action", actorId: caster.basicInfo.id, abilityKey: legendaryAbility.key, targetIds: resolution.targetIds }, participants: order, sourceId: legendaryAbility.source.id })) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_ABILITY_CONDITION_UNMET);

    const inputDice = inputDiceOf(definition.effects);

    if (inputDice && data.inputCount === undefined && !data.preview) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_SPELL_INPUT_REQUIRED);

    const sized = casterSpellDice(caster, { dice: definition.dice, groupId: spell.groupId, level: spell.level, dieSides: definition.dieSides, upcastDice: definition.upcastDice, fixedDice: definition.fixedDice }, castLevel);

    const expected = inputDice ? { ...sized, count: Math.min(data.inputCount ?? 1, inputDice.max) } : sized;

    // прев'ю без кидків: сервер кидає сам, щоб показати орієнтовний результат

    const diceRolls = (data.preview || options.serverRolls) && data.diceRolls.length === 0 ? rollDiceList(`${expected.count}d${expected.sides}`, ctx.rng ?? Math.random) : data.diceRolls;

    assertSpellRolls(expected, diceRolls);

    const { trusted, serverRolled } = splitSaveRolls(ctx, order, data.saveRolls);

    return runWithCritChoice(ctx, {
      action: "spell",
      actorId: data.casterId,
      request: { ...data, diceRolls },
      enabled: ctx.meta.critChoiceByDm && !data.preview,
      resume,
      run: async ({ rng, crit }) => {
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
          optionIndex: data.optionIndex,
          ...(chosen?.ok && { slotKey: data.slotKey }),
          rng,
          crit,
          map: ctx.meta.map,
          rules: ctx.meta.rules,
        });

        if (!result.success) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_FREE_SLOT);

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

        const summoned = await applyAbilitySummons(result.summons.map((r) => (r.inline && resolution.centre ? { ...r, atCell: resolution.centre } : r)), result.allParticipantsUpdated, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng, rules: ctx.meta.rules, deps, map: ctx.meta.map, round: ctx.scene.round });

        const transformed = await applyTransforms(summoned.order, result.transforms ?? [], { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rules: ctx.meta.rules, deps, round: ctx.scene.round });

        summoned.order = transformed.order;
        summoned.messages.push(...transformed.messages);

        if (legendaryAbility) summoned.order = updateParticipant(summoned.order, caster.basicInfo.id, (p) => {
          const used = recordUse(p, legendaryAbility.key, ctx.scene.round, legendaryAbility.limits?.pool);

          return legendaryAbility.limits?.lair ? spendLair(used, ctx.scene.round, legendaryAbility.key) : spendLegendary(used, legendaryCostOf(legendaryAbility));
        });

        if (legendaryAbility) result.battleAction.resultText = `${legendaryAbility.limits?.lair ? "🏰" : "👑"} ${legendaryAbility.name} — ${result.battleAction.resultText}`;

        const action = summoned.messages.length > 0 ? { ...result.battleAction, resultText: [result.battleAction.resultText, ...summoned.messages].join(" | ") } : result.battleAction;

        const dc = grant?.dc ?? spellSaveDc(caster, grant?.dcAbility, ctx.meta.rules.formulas.saveDcBase);

        const zoneMap = spellZoneHazard({ map: ctx.meta.map, spell, cells: resolution.cells, round: ctx.scene.round, spellDamage: result.spellDamage, concentrationOf: result.concentration, casterId: caster.basicInfo.id, dc, centre: resolution.centre, castKey: result.concentration?.castId });

        const terrainMap = spellTerrainEffects({ map: zoneMap ?? ctx.meta.map, effects: definition.effects.filter((e) => e.kind === "createTerrain"), spell, caster, participants: summoned.order, targetIds: resolution.targetIds, cells: resolution.cells, round: ctx.scene.round, concentrationOf: result.concentration, dc });

        const map = terrainMap ?? zoneMap;

        return { participants: summoned.order, pending: ctx.pending, events: [battleActionToEvent(action)], ...(map && { scene: { map } }) };
      },
    });
  };
}
