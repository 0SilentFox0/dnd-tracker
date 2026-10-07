/**
 * Розрахунок урону/лікування заклинання та застосування до цілей
 */

import { applyBalanceDamageMultiplier } from "../damage/balance-multiplier";
import { applyResistance } from "../resistance";
import type { BattleSpell } from "../types/spell-process";
import { calculateSpellDamageWithEnhancements } from "./calculations";
import { participantImmuneToSpell } from "./spell-immunity";

import { BATTLE_CONSTANTS, CombatStatus } from "@/lib/constants/battle";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant, DamageStep } from "@/types/battle";

export interface SpellCalculation {
  totalDamage?: number;
  totalHealing?: number;
  breakdown: string[];
  resistanceBreakdown: string[];
  damageSteps?: Record<string, DamageStep[]>;
}

export interface ComputeSpellDamageParams {
  caster: BattleParticipant;
  spell: BattleSpell;
  damageRolls: number[];
  additionalRollResult?: number;
  savingThrows: Array<{ participantId: string; roll: number }>;
  updatedTargets: BattleParticipant[];
  allParticipants?: BattleParticipant[];
  actionModifiers?: Record<string, StaticEffect[]>;
}

export function computeSpellDamageAndApply(
  params: ComputeSpellDamageParams,
): { spellCalculation: SpellCalculation; updatedTargets: BattleParticipant[] } {
  const {
    caster,
    spell,
    damageRolls,
    additionalRollResult,
    savingThrows,
    updatedTargets,
    allParticipants = [],
    actionModifiers = {},
  } = params;

  const baseValue = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const damageCalc = calculateSpellDamageWithEnhancements(
    caster,
    baseValue,
    additionalRollResult,
    { addHeroLevelToBase: true, allParticipants, actionModifiers: actionModifiers[caster.basicInfo.id] },
    { groupId: spell.groupId ?? null },
  );

  const balance = applyBalanceDamageMultiplier(caster, damageCalc.totalDamage);

  const scaledTotal = balance.damage;

  const allResistanceBreakdown: string[] = [];

  const damageSteps: Record<string, DamageStep[]> = {};

  const targetDamages: Array<{ target: BattleParticipant; finalDamage: number }> = [];

  const dist =
    Array.isArray(spell.damageDistribution) &&
    spell.damageDistribution.length > 0
      ? spell.damageDistribution
      : null;

  for (let i = 0; i < updatedTargets.length; i++) {
    const target = updatedTargets[i];

    const savingThrow = savingThrows.find((st) => st.participantId === target.basicInfo.id);

    const distPct = dist ? (dist[i] ?? 0) : 100;

    let damageToApply = Math.floor((scaledTotal * distPct) / 100);

    if (dist && distPct !== 100) {
      allResistanceBreakdown.push(
        `${target.basicInfo.name}: ${distPct}% від ${scaledTotal} = ${damageToApply}`,
      );
    }

    if (spell.savingThrow && savingThrow) {
      const ability = spell.savingThrow.ability.toLowerCase();

      const statModifier =
        caster.abilities.modifiers[
          ability as keyof typeof caster.abilities.modifiers
        ] || 0;

      const totalSave = savingThrow.roll + statModifier;

      const spellSaveDC =
        typeof spell.savingThrow.dc === "number"
          ? spell.savingThrow.dc
          : caster.spellcasting.spellSaveDC || 10;

      if (totalSave >= spellSaveDC) {
        if (spell.savingThrow.onSuccess === "half") {
          damageToApply = Math.floor(damageToApply / 2);
        } else {
          damageToApply = 0;
        }
      }
    }

    if (participantImmuneToSpell(target, spell.id, allParticipants, actionModifiers[target.basicInfo.id])) {
      damageToApply = 0;
      allResistanceBreakdown.push(
        `${target.basicInfo.name}: імунітет до цього заклинання`,
      );
    }

    const damageType = spell.damageElement || "magic";

    const resistanceResult = applyResistance(target, damageToApply, damageType, { participants: allParticipants, fromSpell: true, extra: actionModifiers[target.basicInfo.id] });

    targetDamages.push({ target, finalDamage: resistanceResult.finalDamage });
    allResistanceBreakdown.push(...resistanceResult.breakdown);
    damageSteps[target.basicInfo.id] = resistanceResult.steps;
  }

  const resultTargets = updatedTargets.map((t) => ({ ...t }));

  for (const { target, finalDamage } of targetDamages) {
    const targetIndex = resultTargets.findIndex((t) => t.basicInfo.id === target.basicInfo.id);

    if (targetIndex === -1) continue;

    if (target.basicInfo.side === caster.basicInfo.side) continue;

    const current = resultTargets[targetIndex];

    let remaining = finalDamage;

    let newTempHp = current.combatStats.tempHp;

    if (newTempHp > 0 && remaining > 0) {
      const tempDmg = Math.min(newTempHp, remaining);

      newTempHp -= tempDmg;
      remaining -= tempDmg;
    }

    const newCurrentHp = Math.max(
      BATTLE_CONSTANTS.MIN_DAMAGE,
      current.combatStats.currentHp - remaining,
    );

    const status =
      newCurrentHp <= 0 ? (newCurrentHp < 0 ? CombatStatus.DEAD : CombatStatus.UNCONSCIOUS) : current.combatStats.status;

    resultTargets[targetIndex] = {
      ...current,
      combatStats: {
        ...current.combatStats,
        tempHp: newTempHp,
        currentHp: newCurrentHp,
        status,
      },
    };
  }

  return {
    spellCalculation: {
      totalDamage: scaledTotal,
      breakdown: balance.multiplier === 1 ? damageCalc.breakdown : [...damageCalc.breakdown, `× ${balance.multiplier.toFixed(2)} (рівний бій) = ${scaledTotal}`],
      resistanceBreakdown: allResistanceBreakdown,
      damageSteps,
    },
    updatedTargets: resultTargets,
  };
}

export function computeSpellHealAndApply(
  caster: BattleParticipant,
  spell: BattleSpell,
  damageRolls: number[],
  additionalRollResult: number | undefined,
  updatedTargets: BattleParticipant[],
  allParticipants: BattleParticipant[] = [],
  actionModifiers: Record<string, StaticEffect[]> = {},
): { spellCalculation: SpellCalculation; updatedTargets: BattleParticipant[] } {
  const baseValue = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const healingCalc = calculateSpellDamageWithEnhancements(
    caster,
    baseValue,
    additionalRollResult,
    { addHeroLevelToBase: true, allParticipants, actionModifiers: actionModifiers[caster.basicInfo.id] },
    { groupId: spell.groupId ?? null },
  );

  const spellCalculation: SpellCalculation = {
    totalHealing: healingCalc.totalDamage,
    breakdown: healingCalc.breakdown,
    resistanceBreakdown: [],
  };

  const resultTargets = updatedTargets.map((t) => ({ ...t }));

  const dist =
    Array.isArray(spell.damageDistribution) &&
    spell.damageDistribution.length > 0
      ? spell.damageDistribution
      : null;

  for (let i = 0; i < updatedTargets.length; i++) {
    const target = updatedTargets[i];

    const targetIndex = resultTargets.findIndex((t) => t.basicInfo.id === target.basicInfo.id);

    if (targetIndex === -1) continue;

    if (participantImmuneToSpell(target, spell.id, allParticipants)) {
      spellCalculation.breakdown.push(
        `${target.basicInfo.name}: імунітет — ефект лікування заблоковано`,
      );
      continue;
    }

    const fullHealing = spellCalculation.totalHealing || 0;

    const distPct = dist ? (dist[i] ?? 0) : 100;

    const healing = Math.floor((fullHealing * distPct) / 100);

    if (dist && distPct !== 100) {
      spellCalculation.breakdown.push(
        `${target.basicInfo.name}: ${distPct}% від ${fullHealing} = ${healing}`,
      );
    }

    resultTargets[targetIndex] = {
      ...resultTargets[targetIndex],
      combatStats: {
        ...resultTargets[targetIndex].combatStats,
        currentHp: Math.min(
          resultTargets[targetIndex].combatStats.maxHp,
          resultTargets[targetIndex].combatStats.currentHp + healing,
        ),
      },
    };

    if (
      resultTargets[targetIndex].combatStats.status === CombatStatus.UNCONSCIOUS &&
      resultTargets[targetIndex].combatStats.currentHp > 0
    ) {
      resultTargets[targetIndex] = {
        ...resultTargets[targetIndex],
        combatStats: {
          ...resultTargets[targetIndex].combatStats,
          status: CombatStatus.ACTIVE,
        },
      };
    }
  }

  return { spellCalculation, updatedTargets: resultTargets };
}
