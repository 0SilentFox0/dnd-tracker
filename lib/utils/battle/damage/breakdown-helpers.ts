/**
 * Допоміжні функції для breakdown урону: резист скіли, рядки по цілі
 */

import {
  applyResistance,
  getCombinedResistancePercent,
} from "../resistance";

import { SkillLevel } from "@/lib/types/skill-tree";
import type { BattleParticipant } from "@/types/battle";

const PHYSICAL_DAMAGE_TYPES = [
  "slashing",
  "piercing",
  "bludgeoning",
  "physical",
];

export function isPhysicalDamageType(dt: string): boolean {
  return PHYSICAL_DAMAGE_TYPES.includes(dt.toLowerCase());
}

const SKILL_LEVEL_RANK: Record<string, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

export function getResistanceSkillsHighestOnly(
  target: BattleParticipant,
  damageType: string,
): Array<{ name: string; percent: number }> {
  const isPhysical = isPhysicalDamageType(damageType);

  const isSpell = damageType.toLowerCase() === "spell";

  const byMainSkill = new Map<
    string,
    { name: string; percent: number; rank: number }
  >();

  for (const skill of target.battleData.activeSkills) {
    let percent = 0;

    let matched = false;

    for (const effect of skill.effects) {
      const stat = (effect.stat ?? "").toLowerCase();

      const val =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (val <= 0) continue;

      if (stat === "physical_resistance" && isPhysical) {
        percent = val;
        matched = true;
        break;
      }

      if (stat === "spell_resistance" && isSpell) {
        percent = val;
        matched = true;
        break;
      }

      if (stat === "all_resistance") {
        percent = val;
        matched = true;
        break;
      }
    }

    if (!matched || percent <= 0) continue;

    const key = skill.mainSkillId || skill.skillId;

    const rank = SKILL_LEVEL_RANK[skill.level ?? SkillLevel.BASIC] ?? 1;

    const existing = byMainSkill.get(key);

    if (!existing || rank > existing.rank) {
      byMainSkill.set(key, { name: skill.name || "Скіл", percent, rank });
    }
  }

  return [...byMainSkill.values()].map((v) => ({
    name: v.name,
    percent: v.percent,
  }));
}

export function getDefenderResistanceBreakdown(
  target: BattleParticipant,
  damageType: string,
  incomingDamage: number,
): { targetBreakdown: string[]; finalDamage: number } {
  const targetBreakdown: string[] = [];

  const targetName = target.basicInfo.name;

  const resistanceSkills = getResistanceSkillsHighestOnly(target, damageType);

  for (const s of resistanceSkills) {
    targetBreakdown.push(
      `${targetName}: вкачаний ${s.name} = ${s.percent}% резисту`,
    );
  }

  const resistanceResult = applyResistance(target, incomingDamage, damageType);

  const finalDamage = resistanceResult.finalDamage;

  const resistPercent = getCombinedResistancePercent(target, damageType);

  if (resistPercent > 0) {
    targetBreakdown.push(
      `Сумарна шкода по ${targetName}: ${incomingDamage} − ${resistPercent}% = ${finalDamage}`,
    );
  } else {
    targetBreakdown.push(`Сумарна шкода по ${targetName}: ${finalDamage}`);
  }

  return { targetBreakdown, finalDamage };
}
