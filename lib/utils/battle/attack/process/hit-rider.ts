import { findParticipant, isActive } from "@/lib/utils/abilities/engine/core/participants";
import { applyRawDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import { critDoublesDice } from "@/lib/utils/battle/attack/crit-dice";
import { type ActionFlow, applyFlowDamage, getP, put, settleDowned } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { applyBalanceDamageMultiplier } from "@/lib/utils/battle/damage/balance-multiplier";
import { dealsNoDamage } from "@/lib/utils/battle/participant/state";
import { applyResistance } from "@/lib/utils/battle/resistance";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import { rollDice } from "@/lib/utils/common/dice";
import type { ResolvedAbility } from "@/types/abilities";
import type { ActiveEffect, BattleAttack, BattleParticipant } from "@/types/battle";

const DICE_COUNT = /^(\d+)d/;

const doubled = (dice: string) => dice.replace(DICE_COUNT, (_, n) => `${Number(n) * 2}d`);

const matches = (e: ActiveEffect, attack: BattleAttack) => !!e.hitRider && (e.hitRider.attackKind === "any" || e.hitRider.attackKind === attackKindOf(attack.type));

const ridersOf = (p: BattleParticipant, attack: BattleAttack) => p.battleData.activeEffects.filter((e) => matches(e, attack));

function spendCharge(flow: ActionFlow, attackerId: string, rider: ActiveEffect): void {
  const attacker = getP(flow, attackerId);

  const left = (rider.hitRider?.chargesLeft ?? 1) - 1;

  if (left <= 0) {
    put(flow, removeEffects(attacker, (e) => e.id === rider.id).participant);

    return;
  }

  put(flow, { ...attacker, battleData: { ...attacker.battleData, activeEffects: attacker.battleData.activeEffects.map((e) => (e.id === rider.id && e.hitRider ? { ...e, hitRider: { ...e.hitRider, chargesLeft: left } } : e)) } });
}

function riderAbility(rider: ActiveEffect): ResolvedAbility {
  const key = (rider.abilityKey ?? rider.id).split("#")[0];

  return { id: `rider-${rider.id}`, name: rider.name, trigger: { event: "spellCast", phase: "after", role: "caster" }, effects: [], stackable: false, key, source: { type: "skill", id: key, name: rider.name } } as ResolvedAbility;
}

function riderSave(flow: ActionFlow, rider: ActiveEffect, attackerId: string, targetId: string): void {
  const state = rider.hitRider;

  if (!state?.save || !isActive(getP(flow, targetId))) return;

  const target = getP(flow, targetId);

  const result = rollSave({ target, ability: state.save.ability, dc: state.save.dc, participants: flow.ps, rules: flow.ctx.rules, rng: flow.ctx.rng, vsSpell: true });

  flow.messages.push(`🎲 ${target.basicInfo.name}: ${rider.name} — рятівний ${state.save.ability.toUpperCase()} ${result.total} проти СК ${state.save.dc}: ${result.success ? "успіх" : "провал"}`);

  if (result.success) return;

  const ownerId = findParticipant(flow.ps, state.casterId) ? state.casterId : attackerId;

  state.save.onFail.forEach((effect, i) => {
    const r = applyEffect({
      participants: flow.ps,
      ability: riderAbility(rider),
      effectIndex: 100 + i,
      ownerId,
      effect,
      targetIds: [targetId],
      event: { type: "spellCast", phase: "after", actorId: ownerId, targetIds: [targetId] },
      ctx: flow.ctx,
    });

    flow.ps = r.participants;
    flow.messages.push(...r.messages);
  });
}

function riderDamage(flow: ActionFlow, rider: ActiveEffect, attackerId: string, targetId: string, crit: boolean): void {
  const state = rider.hitRider;

  if (!state) return;

  const attacker = getP(flow, attackerId);

  if (dealsNoDamage(attacker)) return;

  const dice = critDoublesDice(flow.ctx.rules, crit) ? doubled(state.extraDice) : state.extraDice;

  const rolled = rollDice(dice, flow.ctx.rng);

  const target = getP(flow, targetId);

  const planned = applyBalanceDamageMultiplier(attacker, rolled).damage;

  const resisted = applyResistance(target, planned, state.damageType, { participants: flow.ps, fromSpell: true });

  flow.messages.push(`🎲 ${rider.name}: ${dice} = ${rolled} (${state.damageType})`);

  if (resisted.finalDamage <= 0) return;

  put(flow, applyRawDamage(target, resisted.finalDamage));
  applyFlowDamage(flow, target, resisted.finalDamage, crit);
  flow.messages.push(`💥 ${rider.name}: ${target.basicInfo.name} −${resisted.finalDamage} HP`);
}

/** Заряди додаткової шкоди від заклинань: після влучання кожен відповідного виду завдає шкоду, може змусити до кидка й витрачається. */
export function applyHitRiders(flow: ActionFlow, a: { attackerId: string; targetId: string; attack: BattleAttack; crit: boolean }): void {
  for (const rider of ridersOf(getP(flow, a.attackerId), a.attack)) {
    if (!isActive(getP(flow, a.targetId))) break;

    riderDamage(flow, rider, a.attackerId, a.targetId, a.crit);
    spendCharge(flow, a.attackerId, rider);

    if (isActive(getP(flow, a.targetId))) riderSave(flow, rider, a.attackerId, a.targetId);
    else settleDowned(flow, a.targetId, a.attackerId);
  }
}

export function spendRidersOnMiss(flow: ActionFlow, a: { attackerId: string; attack: BattleAttack }): void {
  for (const rider of ridersOf(getP(flow, a.attackerId), a.attack)) {
    if (!rider.hitRider?.consumeOnMiss) continue;

    flow.messages.push(`✨ ${rider.name}: заряд витрачено на промах`);
    spendCharge(flow, a.attackerId, rider);
  }
}
