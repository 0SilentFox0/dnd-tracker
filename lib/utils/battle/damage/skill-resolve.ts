/**
 * Визначення скілів для бонусу урону (найвищий рівень на mainSkillId)
 */

import { AttackType } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";

const SKILL_LEVEL_RANK: Record<string, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

export function skillAppliesToDamageType(
  skill: { affectsDamage?: boolean; damageType?: string | null },
  attackType: AttackType,
): boolean {
  if (!skill.affectsDamage) return true;

  if (skill.damageType == null || skill.damageType === "") return true;

  const damageKind = attackType === AttackType.MELEE ? "melee" : "ranged";

  return skill.damageType === damageKind;
}

/**
 * Скіли, що впливають на урон для даного типу атаки — лише найвищий рівень на mainSkillId.
 */
export function getSkillsForDamageBonus(
  attacker: BattleParticipant,
  attackType: AttackType,
): ActiveSkill[] {
  const applicable = attacker.battleData.activeSkills.filter((s) =>
    skillAppliesToDamageType(s, attackType),
  );

  const byMainSkill = new Map<string, ActiveSkill>();

  for (const skill of applicable) {
    const key = skill.mainSkillId || skill.skillId;

    const existing = byMainSkill.get(key);

    const rankNew = SKILL_LEVEL_RANK[skill.level ?? SkillLevel.BASIC] ?? 1;

    const rankExisting = existing
      ? (SKILL_LEVEL_RANK[existing.level ?? SkillLevel.BASIC] ?? 1)
      : 0;

    if (!existing || rankNew > rankExisting) {
      byMainSkill.set(key, skill);
    }
  }

  return Array.from(byMainSkill.values());
}
