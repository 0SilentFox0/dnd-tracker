import { resolveAmount } from "@/lib/utils/abilities/engine/core/amount";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { applyRawDamage, applyRawHeal } from "@/lib/utils/abilities/engine/effects/hp";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { applyFlowDamage, getP, put } from "@/lib/utils/battle/common/action-flow";
import { applyBalanceDamageMultiplier } from "@/lib/utils/battle/damage/balance-multiplier";
import { applyResistance, immunityNote } from "@/lib/utils/battle/resistance";
import { outcomeFor } from "@/lib/utils/battle/spell/cast/outcome";
import { isDamageEffect, NO_TARGET_KINDS, type SpellCastState, usesRoll } from "@/lib/utils/battle/spell/cast/state";
import type { AbilityEvent } from "@/types/abilities";

const casterIdOf = (state: SpellCastState) => state.caster.basicInfo.id;

function runEffect(state: SpellCastState, effect: Effect, effectIndex: number, ids: string[], roll: number): void {
  const { flow } = state;

  const event: AbilityEvent = { type: "spellCast", phase: "after", actorId: casterIdOf(state), targetIds: state.targetIds, ...state.info, roll };

  const r = applyEffect({ participants: flow.ps, ability: state.ability, effectIndex, ownerId: casterIdOf(state), effect, targetIds: ids, event, ctx: flow.ctx });

  flow.ps = r.participants;
  flow.messages.push(...r.messages);
  state.summons.push(...(r.summons ?? []));
}

function absorbSpellDamage(state: SpellCastState, id: string, damage: number): void {
  const { flow, spell } = state;

  if (damage <= 0 || !spell.groupId) return;

  for (const f of findFlags(flow.ps, id, "spellAbsorb", state.actionModifiers[id]).filter((x) => x.school === spell.groupId)) {
    const target = getP(flow, id);

    if (target.combatStats.currentHp <= 0) continue;

    const { participant, healed } = applyRawHeal(target, Math.floor((damage * f.percent) / 100));

    if (healed <= 0) continue;

    put(flow, participant);
    flow.messages.push(`💚 ${target.basicInfo.name}: поглинає ${healed} HP (${spell.name})`);
  }
}

function dealSpellDamage(state: SpellCastState, effect: Extract<Effect, { kind: "dealDamage" }>, id: string, roll: number, index: number): void {
  const { flow, spell } = state;

  const target = getP(flow, id);

  const raw = resolveAmount(effect.amount, { owner: getP(flow, casterIdOf(state)), target, spellRoll: roll, rng: state.rng, participants: flow.ps });

  const share = effect.falloff ? effect.falloff[Math.min(index, effect.falloff.length - 1)] : 100;

  const planned = applyBalanceDamageMultiplier(state.caster, Math.floor((raw * share) / 100)).damage;

  if (planned <= 0) return;

  const resisted = applyResistance(target, planned, effect.damageType ?? "magic", { participants: flow.ps, fromSpell: true, school: spell.groupId, extra: state.actionModifiers[id] });

  put(flow, applyRawDamage(target, resisted.finalDamage));
  applyFlowDamage(flow, target, resisted.finalDamage);
  absorbSpellDamage(state, id, resisted.finalDamage);
  state.damageSteps[id] = [...(state.damageSteps[id] ?? []), ...resisted.steps];

  if (resisted.finalDamage === 0 && resisted.immunityApplied) flow.messages.push(immunityNote(target.basicInfo.name, resisted.steps));
}

const baseFor = (state: SpellCastState, e: Effect) => (isDamageEffect(e) ? state.power.damage : state.power.heal);

export function applyTo(state: SpellCastState, effect: Effect, effectIndex: number, id: string, index: number): void {
  state.touchedIds.add(id);

  if (NO_TARGET_KINDS.has(effect.kind)) return runEffect(state, effect, effectIndex, [id], baseFor(state, effect));

  const outcome = outcomeFor(state, id);

  if (outcome.skip || (outcome.factor < 1 && !usesRoll(effect))) return;

  const base = baseFor(state, effect) + (isDamageEffect(effect) ? (outcome.critExtra ?? 0) : 0);

  const roll = Math.floor(base * outcome.factor * (isDamageEffect(effect) ? outcome.raceMultiplier : 1));

  if (effect.kind === "dealDamage") dealSpellDamage(state, effect, id, roll, index);
  else runEffect(state, effect, effectIndex, [id], roll);
}
