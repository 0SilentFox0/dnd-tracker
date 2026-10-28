import { findParticipant, mergeParticipants, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import { type ActionFlow, fire, getP } from "@/lib/utils/battle/common/action-flow";
import { beginConcentration, castIdFor, tagConcentration } from "@/lib/utils/battle/concentration";
import { applyTo } from "@/lib/utils/battle/spell/cast/effects";
import { finishSpellAction, spendCastCost } from "@/lib/utils/battle/spell/cast/finish";
import { resolveOutcome } from "@/lib/utils/battle/spell/cast/outcome";
import { abilityOf, actionOf, isPerTarget, type SpellCastState, targetOf } from "@/lib/utils/battle/spell/cast/state";
import { computeSpellPower, spellSaveDc } from "@/lib/utils/battle/spell/power";
import { spellNeedsSlot, spellSlotKey } from "@/lib/utils/battle/spell/slot";
import type { CastSpellParams, CastSpellResult } from "@/lib/utils/battle/types/spell-process";
import type { AbilityEvent } from "@/types/abilities";

const DEFAULT_CONCENTRATION_ROUNDS = 10;

export function castSpell(params: CastSpellParams): CastSpellResult {
  const { caster, spell, targetIds, allParticipants, currentRound, battleId, diceRolls, saveRolls = [], isDMCast = false } = params;

  const def = spell.definition;

  const rng = params.rng ?? Math.random;

  const casterId = caster.basicInfo.id;

  const flow: ActionFlow = { ps: withSelf(allParticipants, caster), messages: [], summons: [], ctx: { round: currentRound, rng, map: params.map, rules: params.rules } };

  const before = flow.ps;

  const info = { spellId: spell.id, school: spell.groupId, level: spell.level };

  const targetsBefore = targetIds.flatMap((id) => findParticipant(before, id) ?? []);

  const { actionModifiers } = fire(flow, { type: "spellCast", phase: "before", actorId: casterId, targetIds, ...info });

  const readyCaster = getP(flow, casterId);

  const slotKey = spellSlotKey(readyCaster, spell.level);

  const slot = readyCaster.spellcasting.spellSlots[slotKey];

  const usesSlot = !isDMCast && spellNeedsSlot(spell.level);

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
    caster,
    targetIds,
    touchedIds: new Set(targetIds),
    info,
    ability: abilityOf(spell),
    power: computeSpellPower({ caster: readyCaster, groupId: spell.groupId, rolls: diceRolls, participants: flow.ps, extra: actionModifiers[casterId] }),
    saveDc: spellSaveDc(readyCaster),
    actionModifiers,
    rng,
    saveRolls,
    saves: [],
    damageSteps: {},
    outcomes: new Map(),
    summons: [],
  };

  const concentrates = !!params.rules?.concentration.enabled && def.concentration === true;

  const tag = concentrates ? { casterId, castId: castIdFor(casterId, spell.id, currentRound, flow.messages.length) } : undefined;

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
      if (isPerTarget(effect)) applyTo(state, effect, effectIndex, id, index);
    });
  }

  def.effects.forEach((effect, effectIndex) => {
    if (isPerTarget(effect)) return;

    const event: AbilityEvent = { type: "spellCast", phase: "after", actorId: casterId, targetIds, ...info };

    resolveTargetIds(targetOf(effect) as Parameters<typeof resolveTargetIds>[0], casterId, event, flow.ps, flow.ctx).forEach((id, index) => applyTo(state, effect, effectIndex, id, index));
  });

  if (tag) flow.ps = tagConcentration(psBeforeEffects, flow.ps, tag, state.ability.key);

  spendCastCost(state, { slotKey, usesSlot, isDMCast });

  const result = finishSpellAction(state, { before, targetsBefore, allParticipants, battleId, round: currentRound });

  return tag ? { ...result, concentration: tag } : result;
}
