import { findParticipant, mergeParticipants, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import { HIDDEN_MARKER } from "@/lib/utils/battle/actions/effects";
import { type ActionFlow, fire, getP } from "@/lib/utils/battle/common/action-flow";
import { beginConcentration, castIdFor, tagConcentration } from "@/lib/utils/battle/concentration";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { runAutoReactions } from "@/lib/utils/battle/spell/auto-reaction";
import { applyTo } from "@/lib/utils/battle/spell/cast/effects";
import { finishSpellAction, spendCastCost } from "@/lib/utils/battle/spell/cast/finish";
import { applyGrantCasts } from "@/lib/utils/battle/spell/cast/grant-cast";
import { applyHitRiders } from "@/lib/utils/battle/spell/cast/hit-rider";
import { moveAdjacent } from "@/lib/utils/battle/spell/cast/move-self";
import { resolveOutcome } from "@/lib/utils/battle/spell/cast/outcome";
import { abilityOf, actionOf, type ChosenSpell, expandChosen, hasMoveSelf, isPerTarget, readsEventDamage, type SpellCastState, targetOf } from "@/lib/utils/battle/spell/cast/state";
import { computeSpellPower, spellSaveDc } from "@/lib/utils/battle/spell/power";
import { spellNeedsSlot, spellSlotKey } from "@/lib/utils/battle/spell/slot";
import type { CastSpellParams, CastSpellResult } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { AbilityEvent } from "@/types/abilities";

const DEFAULT_CONCENTRATION_ROUNDS = 10;

export function castSpell(params: CastSpellParams): CastSpellResult {
  const { caster, spell: source, targetIds, allParticipants, currentRound, battleId, diceRolls, saveRolls = [], attackRolls = [], isDMCast = false } = params;

  const spell: ChosenSpell = { ...source, definition: { ...source.definition, effects: expandChosen(source.definition.effects, params.optionIndex) } };

  const def = spell.definition;

  if (def.executionMode === "manual") {
    const message = "Налаштуйте механіку заклинання або застосуйте його вручну";

    return { success: false, casterUpdated: caster, allParticipantsUpdated: allParticipants, battleAction: actionOf(caster, spell, [], battleId, currentRound, message), summons: [], messages: [message] };
  }

  const rng = params.rng ?? Math.random;

  const casterId = caster.basicInfo.id;

  const unhidden = removeEffects(caster, (e) => e.effects.some((x) => x.type === HIDDEN_MARKER));

  const flow: ActionFlow = { ps: withSelf(allParticipants, unhidden.participant), messages: [], summons: [], ctx: { round: currentRound, rng, map: params.map, rules: params.rules, crit: params.crit } };

  const before = flow.ps;

  const castLevel = params.castLevel ?? spell.level;

  const info = { spellId: spell.id, school: spell.groupId, level: spell.level, ...(params.castLevel !== undefined && { castLevel }) };

  const targetsBefore = targetIds.flatMap((id) => findParticipant(before, id) ?? []);

  const { actionModifiers } = fire(flow, { type: "spellCast", phase: "before", actorId: casterId, targetIds, ...info });

  const readyCaster = getP(flow, casterId);

  const slotKey = params.slotKey ?? spellSlotKey(readyCaster, spell.level);

  const slot = readyCaster.spellcasting.spellSlots[slotKey];

  const usesSlot = !isDMCast && !params.isLegendaryCast && !params.grant && spellNeedsSlot(spell.level);

  if (usesSlot && (!slot || slot.current <= 0)) {
    return {
      success: false,
      casterUpdated: readyCaster,
      allParticipantsUpdated: mergeParticipants(allParticipants, flow.ps),
      battleAction: actionOf(readyCaster, spell, targetsBefore, battleId, currentRound, `${readyCaster.basicInfo.name}: ${spell.name} недоступне — немає spell slots`),
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
    chosenCastLevel: params.castLevel,
    ability: abilityOf(spell),
    grant: params.grant,
    power: computeSpellPower({ caster: readyCaster, groupId: spell.groupId, rolls: diceRolls, participants: flow.ps, extra: actionModifiers[casterId], addAbilityMod: def.addAbilityMod, damageBonus: def.damageBonus }),
    saveDc: params.grant?.dc ?? spellSaveDc(readyCaster, params.grant?.dcAbility, (params.rules ?? DEFAULT_RULES).formulas.saveDcBase),
    attackBonus: params.grant?.attackBonus,
    battleId,
    actionModifiers,
    rng,
    saveRolls,
    attackRolls,
    diceCount: params.dice?.count ?? 0,
    diceSides: params.dice?.sides ?? 0,
    attacks: [],
    saves: [],
    damageSteps: {},
    outcomes: new Map(),
    summons: [],
    dealt: 0,
  };

  const concentrates = !!params.rules?.concentration.enabled && def.concentration === true;

  const castId = castIdFor(casterId, spell.id, currentRound, flow.messages.length);

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

  spendCastCost(state, { slotKey, usesSlot, isDMCast, isLegendaryCast: params.isLegendaryCast, grant: params.grant });

  const result = finishSpellAction(state, { before, targetsBefore, allParticipants, battleId, round: currentRound, sourceEffects: source.definition.effects });

  return tag ? { ...result, concentration: tag } : result;
}
