/**
 * Розрахунок бонусів урону зі скілів (percent, flat, breakdown)
 */

import { matchesAttackType } from "../common";
import { getSkillsForDamageBonus } from "./skill-resolve";

import { AttackType } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export function calculateSkillDamagePercentBonus(
  attacker: BattleParticipant,
  attackType: AttackType,
): number {
  let totalPercent = 0;

  const skills = getSkillsForDamageBonus(attacker, attackType);

  for (const skill of skills) {
    for (const effect of skill.effects) {
      const isPct = effect.isPercentage === true;

      const numVal =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (isPct && numVal !== 0 && matchesAttackType(effect.stat, attackType)) {
        totalPercent += numVal;
      }
    }
  }

  for (const ae of attacker.battleData.activeEffects) {
    for (const d of ae.effects) {
      const val = typeof d.value === "number" ? d.value : 0;

      const isPct = d.isPercentage === true;

      if (isPct && matchesAttackType(d.type ?? "", attackType)) {
        totalPercent += val;
      }
    }
  }

  return totalPercent;
}

export function calculateSkillDamageFlatBonus(
  attacker: BattleParticipant,
  attackType: AttackType,
): number {
  let totalFlat = 0;

  const skills = getSkillsForDamageBonus(attacker, attackType);

  for (const skill of skills) {
    for (const effect of skill.effects) {
      const isPct = effect.isPercentage === true;

      const numVal =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (
        !isPct &&
        numVal !== 0 &&
        matchesAttackType(effect.stat, attackType)
      ) {
        totalFlat += numVal;
      }
    }
  }

  for (const ae of attacker.battleData.activeEffects) {
    for (const d of ae.effects) {
      const val = typeof d.value === "number" ? d.value : 0;

      if (
        d.isPercentage !== true &&
        matchesAttackType(d.type ?? "", attackType)
      ) {
        totalFlat += val;
      }
    }
  }

  return totalFlat;
}

export function getSkillDamagePercentBreakdownEntries(
  attacker: BattleParticipant,
  attackType: AttackType,
): Array<{ name: string; percent: number }> {
  const entries: Array<{ name: string; percent: number }> = [];

  const skills = getSkillsForDamageBonus(attacker, attackType);

  for (const skill of skills) {
    let percent = 0;

    for (const effect of skill.effects) {
      const isPct = effect.isPercentage === true;

      const numVal =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (isPct && numVal !== 0 && matchesAttackType(effect.stat, attackType)) {
        percent += numVal;
      }
    }

    if (percent !== 0) {
      entries.push({ name: skill.name || "Скіл", percent });
    }
  }

  return entries;
}

export function getSkillDamageFlatBreakdownEntries(
  attacker: BattleParticipant,
  attackType: AttackType,
): Array<{ name: string; flat: number }> {
  const entries: Array<{ name: string; flat: number }> = [];

  const skills = getSkillsForDamageBonus(attacker, attackType);

  for (const skill of skills) {
    let flat = 0;

    for (const effect of skill.effects) {
      const isPct = effect.isPercentage === true;

      const numVal =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (
        !isPct &&
        numVal !== 0 &&
        matchesAttackType(effect.stat, attackType)
      ) {
        flat += numVal;
      }
    }

    if (flat !== 0) {
      entries.push({ name: skill.name || "Скіл", flat });
    }
  }

  return entries;
}
