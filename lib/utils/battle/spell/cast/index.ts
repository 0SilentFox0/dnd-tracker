import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, mergeParticipants, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import { HIDDEN_MARKER } from "@/lib/utils/battle/actions/effects";
import { actionReason } from "@/lib/utils/battle/actions/reasons";
import { type ActionFlow, fire, getP } from "@/lib/utils/battle/common/action-flow";
import { beginConcentration, tagConcentration, uniqueCastId } from "@/lib/utils/battle/concentration";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { runAutoReactions } from "@/lib/utils/battle/spell/auto-reaction";
import { applyAnchoredZones } from "@/lib/utils/battle/spell/cast/anchored-zone";
import { applyCastAttribute, rollCastTest, settleCastTest } from "@/lib/utils/battle/spell/cast/cast-test";
import { applyTo } from "@/lib/utils/battle/spell/cast/effects";
import { finishSpellAction, spendCastCost } from "@/lib/utils/battle/spell/cast/finish";
import { applyGrantCasts } from "@/lib/utils/battle/spell/cast/grant-cast";
import { applyHitRiders } from "@/lib/utils/battle/spell/cast/hit-rider";
import { moveAdjacent } from "@/lib/utils/battle/spell/cast/move-self";
import { resolveOutcome } from "@/lib/utils/battle/spell/cast/outcome";
import { phantomRequests } from "@/lib/utils/battle/spell/cast/phantom";
import { abilityOf, actionOf, type ChosenSpell, expandChosen, hasMoveSelf, isPerTarget, readsEventDamage, type SpellCastState, targetOf } from "@/lib/utils/battle/spell/cast/state";
import { inlineSummonRequests } from "@/lib/utils/battle/spell/cast/summon-inline";
import { transformRequests } from "@/lib/utils/battle/spell/cast/transform";
import { computeSpellPower } from "@/lib/utils/battle/spell/power";
import { spellSaveDc } from "@/lib/utils/battle/spell/save-dc";
import { spellNeedsSlot, spellSlotKey } from "@/lib/utils/battle/spell/slot";
import type { CastSpellParams, CastSpellResult } from "@/lib/utils/battle/types/spell-process";
import { rollGroups } from "@/lib/utils/common/dice";
import { rngOf } from "@/lib/utils/common/rng";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { AbilityEvent } from "@/types/abilities";

const DEFAULT_CONCENTRATION_ROUNDS = 10;

export function castSpell(params: CastSpellParams): CastSpellResult {
  const { caster, spell: source, targetIds, allParticipants, currentRound, battleId, diceRolls, saveRolls = [], attackRolls = [], isDMCast = false } = params;

  const spell: ChosenSpell = { ...source, definition: { ...source.definition, effects: expandChosen(source.definition.effects, params.optionIndex) } };

  const def = spell.definition;

  if (def.executionMode === "manual") {
    const message = actionReason("manualSpell");

    return { success: false, casterUpdated: caster, allParticipantsUpdated: allParticipants, battleAction: actionOf(caster, spell, [], battleId, currentRound, message), summons: [], messages: [message] };
  }

  const rng = rngOf(params);

  const casterId = caster.basicInfo.id;

  const unhidden = removeEffects(caster, (e) => e.effects.some((x) => x.type === HIDDEN_MARKER));

  const flow: ActionFlow = { ps: withSelf(allParticipants, unhidden.participant), messages: [], summons: [], ctx: { round: currentRound, rng, map: params.map, rules: params.rules, crit: params.crit } };

  const before = flow.ps;

  const chosenLevel = params.castLevel ?? spell.level;

  const baseInfo = { spellId: spell.id, school: spell.groupId, level: spell.level, ...(params.castLevel !== undefined && { castLevel: chosenLevel }) };

  const targetsBefore = targetIds.flatMap((id) => findParticipant(before, id) ?? []);

  const { actionModifiers } = fire(flow, { type: "spellCast", phase: "before", actorId: casterId, targetIds, ...baseInfo });

  const readyCaster = getP(flow, casterId);

  const magic = ruleSystemOf(params.rules).magic.tested;

  const percentile = magic && !isDMCast && !params.isLegendaryCast && !params.grant ? magic : undefined;

  const spellMagic = def.casting?.magic;

  if (percentile && (!spellMagic || def.resolution.kind !== "auto")) {
    return { success: false, reason: "systemMismatch", casterUpdated: readyCaster, allParticipantsUpdated: mergeParticipants(allParticipants, flow.ps), battleAction: actionOf(readyCaster, spell, targetsBefore, battleId, currentRound, ""), summons: [], messages: [] };
  }

  const rolled = percentile && spellMagic && !params.dryRun ? rollCastTest(percentile, { caster: readyCaster, spell: source, magic: spellMagic, rules: params.rules, rng }, params.castTest) : undefined;

  const test = rolled && percentile && params.ingredientUsed ? percentile.avertMiscast(rolled, { name: readyCaster.basicInfo.name, spell: spell.name }) : rolled;

  const overcastSteps = test && spellMagic?.overcast === "dice" ? test.overcastSteps : 0;

  const castLevel = overcastSteps > 0 ? spell.level + overcastSteps : chosenLevel;

  const sides = params.dice?.sides ?? 0;

  const extraCount = overcastSteps > 0 && !def.fixedDice && sides > 0 ? (def.upcastDice ?? 0) * overcastSteps : 0;

  const extraRolls = extraCount > 0 ? rollGroups([{ count: extraCount, size: sides }], rng) : [];

  const allRolls = [...diceRolls, ...extraRolls];

  const info = castLevel !== chosenLevel ? { ...baseInfo, castLevel } : baseInfo;

  const slotKey = params.slotKey ?? spellSlotKey(readyCaster, spell.level);

  const slot = readyCaster.spellcasting.spellSlots[slotKey];

  const usesSlot = !magic && !isDMCast && !params.isLegendaryCast && !params.grant && spellNeedsSlot(spell.level);

  if (usesSlot && (!slot || slot.current <= 0)) {
    return {
      success: false,
      casterUpdated: readyCaster,
      allParticipantsUpdated: mergeParticipants(allParticipants, flow.ps),
      battleAction: actionOf(readyCaster, spell, targetsBefore, battleId, currentRound, textRef("battleActions.spell.noSlots", { name: readyCaster.basicInfo.name, spell: spell.name })),
      summons: [],
      messages: [],
    };
  }

  const state: SpellCastState = {
    flow,
    spell,
    caster: unhidden.participant,
    targetIds,
    touchedIds: new Set(targetIds),
    info,
    castLevel,
    chosenCastLevel: castLevel !== chosenLevel ? castLevel : params.castLevel,
    ability: abilityOf(spell),
    grant: params.grant,
    power: computeSpellPower({ caster: readyCaster, groupId: spell.groupId, rolls: allRolls, participants: flow.ps, extra: actionModifiers[casterId], addAbilityMod: def.addAbilityMod, damageBonus: def.damageBonus }),
    saveDc: params.grant?.dc ?? spellSaveDc(params.rules, readyCaster, params.grant?.dcAbility),
    attackBonus: params.grant?.attackBonus,
    battleId,
    actionModifiers,
    rng,
    saveRolls,
    attackRolls,
    diceRolls: allRolls,
    diceCount: (params.dice?.count ?? 0) + extraRolls.length,
    diceSides: params.dice?.sides ?? 0,
    attacks: [],
    saves: [],
    damageSteps: {},
    outcomes: new Map(),
    summons: [],
    transforms: [],
    dealt: 0,
  };

  if (test) flow.messages.push(...test.lines);

  const settle = percentile && spellMagic && test ? { magic: percentile, spellMagic, cast: test } : undefined;

  if (settle && !settle.cast.success) {
    spendCastCost(state, { slotKey, usesSlot, isDMCast, isLegendaryCast: params.isLegendaryCast, grant: params.grant });
    settleCastTest(state, settle);

    return finishSpellAction(state, { before, targetsBefore, allParticipants, battleId, round: currentRound, sourceEffects: source.definition.effects, details: settle.cast.details, fizzled: true });
  }

  const concentrates = !!params.rules?.concentration.enabled && def.concentration === true;

  const castId = uniqueCastId(flow.ps, params.map, casterId, spell.id, currentRound);

  const tag = concentrates ? { casterId, castId } : undefined;

  if (tag) {
    const zoneRounds = def.targeting.kind === "template" ? (def.targeting.zone?.rounds ?? 0) : 0;

    const rounds = Math.max(zoneRounds, ...def.effects.map((e) => ("duration" in e ? (e.duration?.rounds ?? 0) : 0)));

    const begun = beginConcentration(flow.ps, casterId, tag.castId, spell.name, rounds || DEFAULT_CONCENTRATION_ROUNDS, currentRound);

    flow.ps = begun.participants;
    flow.messages.push(...begun.messages);
  }

  const psBeforeEffects = flow.ps;

  for (const id of targetIds) state.outcomes.set(id, resolveOutcome(state, id, true));

  for (const [index, id] of targetIds.entries()) {
    def.effects.forEach((effect, effectIndex) => {
      if (isPerTarget(effect) && !readsEventDamage(effect)) applyTo(state, effect, effectIndex, id, index);
    });
  }

  def.effects.forEach((effect, effectIndex) => {
    if (isPerTarget(effect)) return;

    if ("onlyIfAffected" in effect && effect.onlyIfAffected && targetIds.every((id) => state.outcomes.get(id)?.skip !== false)) return;

    const event: AbilityEvent = { type: "spellCast", phase: "after", actorId: casterId, targetIds, ...info };

    resolveTargetIds(targetOf(effect) as Parameters<typeof resolveTargetIds>[0], casterId, event, flow.ps, flow.ctx).forEach((id, index) => applyTo(state, effect, effectIndex, id, index));
  });

  for (const [index, id] of targetIds.entries()) {
    def.effects.forEach((effect, effectIndex) => {
      if (isPerTarget(effect) && readsEventDamage(effect)) applyTo(state, effect, effectIndex, id, index);
    });
  }

  applyHitRiders({ flow, effects: source.definition.effects, casterId, targetIds, ability: state.ability, saveDc: state.saveDc, round: currentRound });

  applyAnchoredZones({ flow, effects: source.definition.effects, casterId, targetIds, ability: state.ability, spellId: spell.id, saveDc: state.saveDc, round: currentRound });

  if (hasMoveSelf(source.definition.effects) && targetIds[0]) {
    const moved = moveAdjacent(flow.ctx.map, flow.ps, casterId, targetIds[0]);

    flow.ps = moved.participants;

    if (moved.message) flow.messages.push(moved.message);
  }

  if (def.resolution.kind === "attack" && !params.grant?.inline?.auto) {
    for (const id of targetIds) runAutoReactions(flow, { attackerId: casterId, targetId: id, targetHpBefore: findParticipant(before, id)?.combatStats.currentHp ?? 0 }, castSpell);
  }

  if (tag) flow.ps = tagConcentration(psBeforeEffects, flow.ps, tag, state.ability.key);

  applyGrantCasts({ flow, effects: source.definition.effects, casterId, targetIds, spell, castId, round: currentRound, concentrationOf: tag });

  state.summons.push(...inlineSummonRequests({ effects: source.definition.effects, caster: readyCaster, spell, castLevel, saveDc: state.saveDc, round: currentRound, castId, concentrationOf: tag }));

  state.summons.push(...phantomRequests(state, source.definition.effects, castId));

  state.transforms.push(...transformRequests(state, source.definition.effects, currentRound, castId, tag));

  if (settle) applyCastAttribute(state, settle);

  spendCastCost(state, { slotKey, usesSlot, isDMCast, isLegendaryCast: params.isLegendaryCast, grant: params.grant });

  if (settle) settleCastTest(state, settle);

  const result = finishSpellAction(state, { before, targetsBefore, allParticipants, battleId, round: currentRound, sourceEffects: source.definition.effects, ...(test && { details: test.details }) });

  return tag ? { ...result, concentration: tag } : result;
}
