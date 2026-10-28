import { CELL_FEET } from "@/lib/constants/battle";
import { resolveAmount } from "@/lib/utils/abilities/engine/core/amount";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { applyRawDamage, applyRawHeal } from "@/lib/utils/abilities/engine/effects/hp";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { applyFlowDamage, getP, put } from "@/lib/utils/battle/common/action-flow";
import { applyBalanceDamageMultiplier } from "@/lib/utils/battle/damage/balance-multiplier";
import { bothOnMap, cellsOf, footprintDistance } from "@/lib/utils/battle/grid";
import { applyResistance, immunityNote } from "@/lib/utils/battle/resistance";
import { outcomeFor } from "@/lib/utils/battle/spell/cast/outcome";
import { isDamageEffect, NO_TARGET_KINDS, type SpellCastState, usesRoll } from "@/lib/utils/battle/spell/cast/state";
import { upcastSteps } from "@/lib/utils/battle/spell/caster-dice";
import { computeSpellPower } from "@/lib/utils/battle/spell/power";
import { rollDice } from "@/lib/utils/common/dice";
import type { AbilityEvent } from "@/types/abilities";

const casterIdOf = (state: SpellCastState) => state.caster.basicInfo.id;

function freezeSpellRoll(effect: Effect, roll: number): Effect {
  if (effect.kind !== "damageBonus" || typeof effect.flat !== "object" || !("spellRoll" in effect.flat)) return effect;

  return { ...effect, flat: Math.trunc((roll * effect.flat.spellRoll) / 100) };
}

function runEffect(state: SpellCastState, source: Effect, effectIndex: number, ids: string[], roll: number): void {
  const { flow } = state;

  const effect = freezeSpellRoll(source, roll);

  const event: AbilityEvent = { type: "spellCast", phase: "after", actorId: casterIdOf(state), targetIds: state.targetIds, ...state.info, roll, damage: state.dealt };

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
  state.dealt += resisted.finalDamage;
  applyFlowDamage(flow, target, resisted.finalDamage);
  absorbSpellDamage(state, id, resisted.finalDamage);
  state.damageSteps[id] = [...(state.damageSteps[id] ?? []), ...resisted.steps];

  if (resisted.finalDamage === 0 && resisted.immunityApplied) flow.messages.push(immunityNote(target.basicInfo.name, resisted.steps));
}

const DICE_COUNT = /^(\d+)d(\d+)$/;

function rangeDice(state: SpellCastState, dice: string): string {
  const { definition, level } = state.spell;

  const extra = definition.fixedDice ? 0 : (definition.upcastDice ?? 0) * upcastSteps(level, state.castLevel);

  const m = DICE_COUNT.exec(dice);

  return m && extra > 0 ? `${Number(m[1]) + extra}d${m[2]}` : dice;
}

function distanceDamage(state: SpellCastState, ranges: NonNullable<Extract<Effect, { kind: "dealDamage" }>["byDistance"]>, id: string): number {
  const { flow } = state;

  const me = getP(flow, casterIdOf(state));

  const target = getP(flow, id);

  const onMap = bothOnMap(flow.ctx.map, me, target);

  const feet = onMap ? footprintDistance(cellsOf(me), cellsOf(target)) * CELL_FEET : 0;

  if (!onMap) flow.messages.push(`📏 ${state.spell.name}: без мапи — найближчий діапазон`);

  const range = ranges.find((r) => r.maxFeet >= feet) ?? ranges[ranges.length - 1];

  const dice = rangeDice(state, range.dice);

  if (onMap) flow.messages.push(`📏 ${target.basicInfo.name}: дистанція ${feet} фт → ${dice}`);

  const rolled = rollDice(dice, state.rng);

  return computeSpellPower({ caster: me, groupId: state.spell.groupId, rolls: [rolled], participants: flow.ps, extra: state.actionModifiers[casterIdOf(state)], addAbilityMod: state.spell.definition.addAbilityMod, damageBonus: state.spell.definition.damageBonus }).damage;
}

const baseFor = (state: SpellCastState, e: Effect, id: string) => {
  if (e.kind === "dealDamage" && e.byDistance) return distanceDamage(state, e.byDistance, id);

  return isDamageEffect(e) ? state.power.damage : state.power.heal;
};

export function applyTo(state: SpellCastState, effect: Effect, effectIndex: number, id: string, index: number): void {
  state.touchedIds.add(id);

  if (NO_TARGET_KINDS.has(effect.kind)) return runEffect(state, effect, effectIndex, [id], baseFor(state, effect, id));

  const outcome = outcomeFor(state, id);

  if (outcome.negateEffects && effect.kind !== "dealDamage" && effect.kind !== "heal") return;

  if (outcome.skip || (outcome.factor < 1 && !usesRoll(effect))) return;

  const base = baseFor(state, effect, id) + (isDamageEffect(effect) ? (outcome.critExtra ?? 0) : 0);

  const roll = Math.floor(base * outcome.factor * (isDamageEffect(effect) ? outcome.raceMultiplier : 1));

  if (effect.kind === "dealDamage") dealSpellDamage(state, effect, id, roll, index);
  else runEffect(state, effect, effectIndex, [id], roll);
}
