/**
 * Визначення скілів для бонусу урону (найвищий рівень на mainSkillId).
 *
 * Підтримує три види шкоди: melee / ranged / magic (`SkillDamageType`).
 * Параметри сигнатур приймають `AttackType` (legacy enum) або `SkillDamageType`
 * рядок — обидва нормалізуються до того ж простору значень.
 */

import { AttackType } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type {
  ActiveSkill,
  BattleParticipant,
  SkillDamageType,
} from "@/types/battle";

export const SKILL_LEVEL_RANK: Record<string, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

/** Нормалізує AttackType enum або SkillDamageType-рядок до SkillDamageType. */
export function toSkillDamageType(
  attackType: AttackType | SkillDamageType,
): SkillDamageType {
  return attackType as SkillDamageType;
}

/**
 * Скіл застосовується до даного виду шкоди, якщо:
 *  - `affectsDamage` не виставлено в true (універсальні скіли) — застосовується до всіх,
 *  - або `damageType` не виставлено явно — застосовується до всіх,
 *  - або `damageType` точно дорівнює виду шкоди.
 */
export function skillAppliesToDamageType(
  skill: { affectsDamage?: boolean; damageType?: string | null },
  attackType: AttackType | SkillDamageType,
): boolean {
  if (!skill.affectsDamage) return true;

  if (skill.damageType == null || skill.damageType === "") return true;

  return skill.damageType === toSkillDamageType(attackType);
}

/**
 * School scope фільтр (релевантний лише для magic):
 *  - non-magic kind: завжди true (школа не релевантна);
 *  - magic kind, скіл без `spellGroupId`: true (універсальний скіл);
 *  - magic kind, скіл зі `spellGroupId` і ціль зі `spellGroupId`: збіг id;
 *  - magic kind, скіл зі `spellGroupId` без `spellGroupId` цілі: true
 *    (контекст невідомий — fall back до старої поведінки).
 */
export function skillAppliesToSpell(
  skill: ActiveSkill,
  kind: SkillDamageType,
  ctx?: { spellGroupId?: string | null },
): boolean {
  if (kind !== "magic") return true;

  const skillSpellGroupId = skill.spellGroupId ?? null;

  if (!skillSpellGroupId) return true;

  const targetSpellGroupId = ctx?.spellGroupId ?? null;

  if (!targetSpellGroupId) return true;

  return skillSpellGroupId === targetSpellGroupId;
}

/**
 * Скіли, що впливають на урон для даного виду шкоди — лише найвищий рівень на mainSkillId.
 *
 * Опційний `ctx.spellGroupId` (для magic) обмежує бонус відповідною школою:
 * наприклад, експертний "Магія хаосу" не дає +25% заклинанням школи Темної магії.
 */
export function getSkillsForDamageBonus(
  attacker: BattleParticipant,
  attackType: AttackType | SkillDamageType,
  ctx?: { spellGroupId?: string | null },
): ActiveSkill[] {
  const kind = toSkillDamageType(attackType);

  const applicable = attacker.battleData.activeSkills.filter(
    (s) =>
      skillAppliesToDamageType(s, kind) && skillAppliesToSpell(s, kind, ctx),
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
