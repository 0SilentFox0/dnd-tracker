import { calculateDamageWithModifiers } from "../../damage";
import { applyBalanceDamageMultiplier, scaleAdditionalDamage } from "../../damage/balance-multiplier";
import { heroAttackDamageParts, heroDamageContext } from "../../damage/hero-damage";
import { applyHeroDmDamageMultiplier } from "../../damage/hero-dm-multiplier";
import { applyObstacle, obstacleStep } from "../../damage/obstacle";
import { applyWeaponFlat } from "../../damage/weapon-flat";
import { applyResistance } from "../../resistance";
import type { DamageCalculationResult } from "../../types/damage-calculations";
import { applyCriticalEffect } from "..";
import { applyResistanceForAdditional } from "./damage";

import { AttackType, ParticipantSourceType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { attackAbilityLabelFor, attackDamageModifier } from "@/lib/utils/battle/attack/ability";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { dealsNoDamage, findEffectMarker } from "@/lib/utils/battle/participant/state";
import { maxOf, parseDice, parseDiceLenient, rollGroups } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

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
  bonusLabel?: string;
  offTurn?: boolean;
  obstacle?: boolean;
  rng?: () => number;
}

export interface ComputeHitDamageResult {
  damageCalculation: DamageCalculationResult;
  physicalDamage: number;
  totalFinalDamage: number;
  resistanceResult: { finalDamage: number; breakdown: string[] };
  additionalDamageBreakdown: string[];
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
  breakdown: string[];
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
      statLabel: attackAbilityLabelFor(updatedAttacker, attack),
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

  if (pacified) damageCalculation.breakdown.push("🕊 стан: не завдає шкоди = 0");

  if (dmgMult !== 1) state.steps.push({ label: "Частка шкоди", side: "attacker", kind: "multiplier", value: dmgMult, after: physicalDamageForTarget });

  state.steps.push(...resistanceResult.steps);

  if (totalAdditionalDamage > 0) state.steps.push({ label: "Додаткова шкода", side: "attacker", kind: "flat", value: totalAdditionalDamage, after: unhalvedDamage });

  if (params.obstacle) {
    state.steps.push(obstacleStep(unhalvedDamage));
    state.breakdown.push("──────────");
    state.breakdown.push(`× 0.5 (перешкода) = ${totalFinalDamage}`);
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
    state.steps.push({ label: effect.name, side: "attacker", kind: "multiplier", value: 2, after: state.damage });
  }

  if (effect?.effect.type === "max_damage") {
    const before = state.damage;

    const { formula, weaponDice } = heroAttackDamageParts(ctx.attacker, ctx.attack);

    const weaponFlat = ctx.attacker.basicInfo.sourceType === ParticipantSourceType.CHARACTER ? (parseDice(weaponDice)?.flat ?? 0) + (ctx.attack.damageBonus ?? 0) : 0;

    state.damage = maxOf(parseDiceLenient(formula)) + weaponFlat + ctx.statModifier;
    state.steps.push({ label: effect.name, side: "attacker", kind: "flat", value: state.damage - before, after: state.damage });
  }

  if (effect?.effect.type === "additional_damage") {
    const extra = rollGroups([{ count: 1, size: 6 }], ctx.rng)[0];

    state.damage += extra;
    state.steps.push({ label: effect.name, side: "attacker", kind: "flat", value: extra, after: state.damage });
  }
}

function applyWeaponFlatStep(state: PhysicalState, effect: CriticalEffect | undefined, attack: BattleAttack): void {
  if (effect?.effect.type === "max_damage") return;

  const flat = applyWeaponFlat(state.damage, attack);

  state.damage = flat.damage;

  if (flat.step && flat.line) {
    state.breakdown.push("──────────");
    state.breakdown.push(flat.line);
    state.steps.push(flat.step);
  }
}

function applyAttackerMultipliers(
  state: PhysicalState,
  ctx: { original: BattleParticipant; attacker: BattleParticipant; attack: BattleAttack; bonusPercent?: number; bonusLabel?: string },
): void {
  const weakened = findEffectMarker(ctx.original, "weakened_next_hit");

  if (weakened) {
    state.damage = Math.floor(state.damage * weakened.value);
    state.steps.push({ label: weakened.effect.name, side: "attacker", kind: "multiplier", value: weakened.value, after: state.damage });
  }

  const heroDm = applyHeroDmDamageMultiplier(ctx.attacker, ctx.attack.type as AttackType, state.damage);

  state.damage = heroDm.damage;

  if (heroDm.breakdownLine) {
    state.breakdown.push("──────────");
    state.breakdown.push(heroDm.breakdownLine);
    state.steps.push({ label: "Архетип", side: "attacker", kind: "multiplier", value: heroDm.multiplier, after: state.damage });
  }

  const balance = applyBalanceDamageMultiplier(ctx.attacker, state.damage);

  if (balance.multiplier !== 1) {
    state.damage = balance.damage;
    state.breakdown.push("──────────");
    state.breakdown.push(`× ${balance.multiplier.toFixed(2)} (рівний бій) = ${state.damage}`);
    state.steps.push({ label: "Рівний бій", side: "attacker", kind: "multiplier", value: balance.multiplier, after: state.damage });
  }

  if (ctx.bonusPercent) {
    const factor = 1 + ctx.bonusPercent / 100;

    state.damage = Math.floor(state.damage * factor);
    state.steps.push({ label: ctx.bonusLabel ?? "Контратака", side: "attacker", kind: "multiplier", value: factor, after: state.damage });
  }
}
