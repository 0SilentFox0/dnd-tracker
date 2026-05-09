/**
 * Розрахунок урону/лікування заклинання та застосування до цілей
 */

import { applyResistance } from "../resistance";
import type { BattleSpell } from "../types/spell-process";
import { calculateSpellDamageWithEnhancements } from "./calculations";
import { participantImmuneToSpell } from "./spell-immunity";

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export interface SpellCalculation {
  totalDamage?: number;
  totalHealing?: number;
  breakdown: string[];
  resistanceBreakdown: string[];
}

export interface ComputeSpellDamageParams {
  caster: BattleParticipant;
  spell: BattleSpell;
  damageRolls: number[];
  additionalRollResult?: number;
  savingThrows: Array<{ participantId: string; roll: number }>;
  updatedTargets: BattleParticipant[];
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
  } = params;

  const baseValue = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const damageCalc = calculateSpellDamageWithEnhancements(
    caster,
    baseValue,
    additionalRollResult,
    { addHeroLevelToBase: true },
    { groupId: spell.groupId ?? null },
  );

  const allResistanceBreakdown: string[] = [];

  const targetDamages: Array<{ target: BattleParticipant; finalDamage: number }> = [];

  for (let i = 0; i < updatedTargets.length; i++) {
    const target = updatedTargets[i];

    const savingThrow = savingThrows.find((st) => st.participantId === target.basicInfo.id);

    let damageToApply = damageCalc.totalDamage;

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

    if (participantImmuneToSpell(target, spell.id)) {
      damageToApply = 0;
      allResistanceBreakdown.push(
        `${target.basicInfo.name}: імунітет до цього заклинання`,
      );
    }

    const damageType = spell.damageElement || "magic";

    const resistanceResult = applyResistance(target, damageToApply, damageType);

    targetDamages.push({ target, finalDamage: resistanceResult.finalDamage });
    allResistanceBreakdown.push(...resistanceResult.breakdown);
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
      newCurrentHp <= 0 ? (newCurrentHp < 0 ? "dead" : "unconscious") : current.combatStats.status;

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
      totalDamage: damageCalc.totalDamage,
      breakdown: damageCalc.breakdown,
      resistanceBreakdown: allResistanceBreakdown,
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
): { spellCalculation: SpellCalculation; updatedTargets: BattleParticipant[] } {
  const baseValue = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const healingCalc = calculateSpellDamageWithEnhancements(
    caster,
    baseValue,
    additionalRollResult,
    { addHeroLevelToBase: true },
    { groupId: spell.groupId ?? null },
  );

  const spellCalculation: SpellCalculation = {
    totalHealing: healingCalc.totalDamage,
    breakdown: healingCalc.breakdown,
    resistanceBreakdown: [],
  };

  const resultTargets = updatedTargets.map((t) => ({ ...t }));

  for (const target of updatedTargets) {
    const targetIndex = resultTargets.findIndex((t) => t.basicInfo.id === target.basicInfo.id);

    if (targetIndex === -1) continue;

    if (participantImmuneToSpell(target, spell.id)) {
      spellCalculation.breakdown.push(
        `${target.basicInfo.name}: імунітет — ефект лікування заблоковано`,
      );
      continue;
    }

    const healing = spellCalculation.totalHealing || 0;

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
      resultTargets[targetIndex].combatStats.status === "unconscious" &&
      resultTargets[targetIndex].combatStats.currentHp > 0
    ) {
      resultTargets[targetIndex] = {
        ...resultTargets[targetIndex],
        combatStats: {
          ...resultTargets[targetIndex].combatStats,
          status: "active",
        },
      };
    }
  }

  return { spellCalculation, updatedTargets: resultTargets };
}
