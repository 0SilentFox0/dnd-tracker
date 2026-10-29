import { calculateDamageWithModifiers } from "../../damage";
import { applyBalanceDamageMultiplier, scaleAdditionalDamage } from "../../damage/balance-multiplier";
import { heroAttackDamageParts, heroDamageContext } from "../../damage/hero-damage";
import { applyHeroDmDamageMultiplier } from "../../damage/hero-dm-multiplier";
import { applyObstacle, obstacleStep } from "../../damage/obstacle";
import { multiplierRow, ruleRow } from "../../damage/rows";
import { applyWeaponFlat } from "../../damage/weapon-flat";
import { applyResistance } from "../../resistance";
import type { DamageCalculationResult } from "../../types/damage-calculations";
import { applyCriticalEffect } from "..";
import { applyResistanceForAdditional } from "./damage";

import { AttackType, ParticipantSourceType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { textRef } from "@/lib/i18n/text-ref";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { attackAbilityFor, attackDamageModifier } from "@/lib/utils/battle/attack/ability";
import { critNameRef } from "@/lib/utils/battle/attack/critical";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { dealsNoDamage, findEffectMarker } from "@/lib/utils/battle/participant/state";
import { maxOf, parseDice, parseDiceLenient, rollGroups } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant, DamageRow, DamageStep } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface ComputeHitDamageParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  attackRoll: { isCritical: boolean; criticalEffect?: CriticalEffect };
  damageMultiplier?: number;
  currentRound: number;
  actionModifiers?: StaticEffect[];
  bonusPercent?: number;
  bonusLabel?: LogLine;
  offTurn?: boolean;
  obstacle?: boolean;
  rng?: () => number;
}

export interface ComputeHitDamageResult {
  damageCalculation: DamageCalculationResult;
  physicalDamage: number;
  totalFinalDamage: number;
  resistanceResult: { finalDamage: number; breakdown: LogLine[] };
  additionalDamageBreakdown: LogLine[];
  dmgMult: number;
  statModifier: number;
  updatedAttacker: BattleParticipant;
  updatedTarget: BattleParticipant;
  criticalEffectApplied?: CriticalEffect;
  damageSteps: DamageStep[];
  oldHp: number;
}

interface PhysicalState {
  damage: number;
  steps: DamageStep[];
  breakdown: DamageRow[];
}

export function computeHitDamage(params: ComputeHitDamageParams): ComputeHitDamageResult {
  const { attacker, target, attack, damageRolls, allParticipants, attackRoll, damageMultiplier, currentRound } = params;

  let updatedAttacker = { ...attacker };

  let updatedTarget = { ...target };

  const baseDamage = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const statModifier = attackDamageModifier(updatedAttacker, attack, allParticipants);

  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];

  const damageCalculation = calculateDamageWithModifiers(
    updatedAttacker,
    baseDamage,
    statModifier,
    attack.type as AttackType,
    {
      allParticipants,
      targetId: target.basicInfo.id,
      additionalDamage: additionalDamageModifiers,
      ...heroDamageContext(updatedAttacker, attack, damageRolls),
      actionModifiers: params.actionModifiers,
      statKey: attackAbilityFor(updatedAttacker, attack),
    },
  );

  let criticalEffectApplied: CriticalEffect | undefined;

  if (attackRoll.isCritical && attackRoll.criticalEffect) {
    criticalEffectApplied = attackRoll.criticalEffect;

    if (criticalEffectApplied.effect.target === "target") {
      updatedTarget = applyCriticalEffect(updatedTarget, criticalEffectApplied, currentRound, { offTurn: params.offTurn });
    } else if (criticalEffectApplied.effect.target === "self") {
      updatedAttacker = applyCriticalEffect(updatedAttacker, criticalEffectApplied, currentRound, { offTurn: params.offTurn, source: target.basicInfo.id });
    }
  }

  const state: PhysicalState = { damage: damageCalculation.totalDamage, steps: [...damageCalculation.steps], breakdown: damageCalculation.breakdown };

  applyCriticalDamage(state, criticalEffectApplied, { attacker: updatedAttacker, attack, statModifier, rng: params.rng });
  applyWeaponFlatStep(state, criticalEffectApplied, attack);
  applyAttackerMultipliers(state, { original: attacker, attacker: updatedAttacker, attack, bonusPercent: params.bonusPercent, bonusLabel: params.bonusLabel });

  const dmgMult = damageMultiplier !== undefined && damageMultiplier >= 0 ? damageMultiplier : 1;

  const physicalDamageForTarget = Math.floor(state.damage * dmgMult);

  const resistanceResult = applyResistance(
    updatedTarget,
    physicalDamageForTarget,
    attack.damageType ?? "physical",
    { participants: allParticipants, attackKind: attackKindOf(attack.type) },
  );

  const { totalAdditionalDamage, additionalDamageBreakdown } = applyResistanceForAdditional(
    updatedTarget,
    scaleAdditionalDamage(updatedAttacker, damageCalculation.additionalDamage),
    dmgMult,
    allParticipants,
    attackKindOf(attack.type),
  );

  const unhalvedDamage = resistanceResult.finalDamage + totalAdditionalDamage;

  const pacified = dealsNoDamage(attacker);

  const totalFinalDamage = pacified ? 0 : params.obstacle ? applyObstacle(unhalvedDamage) : unhalvedDamage;

  if (pacified) damageCalculation.breakdown.push({ label: textRef("battleLog.damage.rows.pacified"), tone: "note" });

  if (dmgMult !== 1) state.steps.push({ label: textRef("battleLog.damage.steps.share"), side: "attacker", kind: "multiplier", value: dmgMult, after: physicalDamageForTarget });

  state.steps.push(...resistanceResult.steps);

  if (totalAdditionalDamage > 0) state.steps.push({ label: textRef("battleLog.damage.steps.additional"), side: "attacker", kind: "flat", value: totalAdditionalDamage, after: unhalvedDamage });

  if (params.obstacle) {
    state.steps.push(obstacleStep(unhalvedDamage));
    state.breakdown.push(ruleRow(), multiplierRow(textRef("battleLog.damage.rows.obstacle"), "0.5", totalFinalDamage));
  }

  return {
    damageCalculation,
    physicalDamage: state.damage,
    totalFinalDamage,
    resistanceResult,
    additionalDamageBreakdown,
    dmgMult,
    statModifier,
    updatedAttacker,
    updatedTarget,
    criticalEffectApplied,
    damageSteps: state.steps,
    oldHp: updatedTarget.combatStats.currentHp,
  };
}

function applyCriticalDamage(
  state: PhysicalState,
  effect: CriticalEffect | undefined,
  ctx: { attacker: BattleParticipant; attack: BattleAttack; statModifier: number; rng?: () => number },
): void {
  if (effect?.effect.type === "double_damage") {
    state.damage *= 2;
    state.steps.push({ label: critNameRef(effect), side: "attacker", kind: "multiplier", value: 2, after: state.damage });
  }

  if (effect?.effect.type === "max_damage") {
    const before = state.damage;

    const { formula, weaponDice } = heroAttackDamageParts(ctx.attacker, ctx.attack);

    const weaponFlat = ctx.attacker.basicInfo.sourceType === ParticipantSourceType.CHARACTER ? (parseDice(weaponDice)?.flat ?? 0) + (ctx.attack.damageBonus ?? 0) : 0;

    state.damage = maxOf(parseDiceLenient(formula)) + weaponFlat + ctx.statModifier;
    state.steps.push({ label: critNameRef(effect), side: "attacker", kind: "flat", value: state.damage - before, after: state.damage });
  }

  if (effect?.effect.type === "additional_damage") {
    const extra = rollGroups([{ count: 1, size: 6 }], ctx.rng)[0];

    state.damage += extra;
    state.steps.push({ label: critNameRef(effect), side: "attacker", kind: "flat", value: extra, after: state.damage });
  }
}

function applyWeaponFlatStep(state: PhysicalState, effect: CriticalEffect | undefined, attack: BattleAttack): void {
  if (effect?.effect.type === "max_damage") return;

  const flat = applyWeaponFlat(state.damage, attack);

  state.damage = flat.damage;

  if (flat.step && flat.rows) {
    state.breakdown.push(...flat.rows);
    state.steps.push(flat.step);
  }
}

function applyAttackerMultipliers(
  state: PhysicalState,
  ctx: { original: BattleParticipant; attacker: BattleParticipant; attack: BattleAttack; bonusPercent?: number; bonusLabel?: LogLine },
): void {
  const weakened = findEffectMarker(ctx.original, "weakened_next_hit");

  if (weakened) {
    state.damage = Math.floor(state.damage * weakened.value);
    state.steps.push({ label: weakened.effect.name, side: "attacker", kind: "multiplier", value: weakened.value, after: state.damage });
  }

  const heroDm = applyHeroDmDamageMultiplier(ctx.attacker, ctx.attack.type as AttackType, state.damage);

  state.damage = heroDm.damage;

  if (heroDm.breakdownRow) {
    state.breakdown.push(ruleRow(), heroDm.breakdownRow);
    state.steps.push({ label: textRef("battleLog.damage.steps.archetype"), side: "attacker", kind: "multiplier", value: heroDm.multiplier, after: state.damage });
  }

  const balance = applyBalanceDamageMultiplier(ctx.attacker, state.damage);

  if (balance.multiplier !== 1) {
    state.damage = balance.damage;
    state.breakdown.push(ruleRow(), multiplierRow(textRef("battleLog.damage.rows.fairBattle"), balance.multiplier.toFixed(2), state.damage));
    state.steps.push({ label: textRef("battleLog.damage.steps.fairBattle"), side: "attacker", kind: "multiplier", value: balance.multiplier, after: state.damage });
  }

  if (ctx.bonusPercent) {
    const factor = 1 + ctx.bonusPercent / 100;

    state.damage = Math.floor(state.damage * factor);
    state.steps.push({ label: ctx.bonusLabel ?? textRef("battleLog.damage.steps.counter"), side: "attacker", kind: "multiplier", value: factor, after: state.damage });
  }
}
