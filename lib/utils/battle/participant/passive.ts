/**
 * Application of passive skill / artifact effects до учасника бою.
 *
 * Per-effect logika — в apply-passive-stat-effect.ts (CODE_AUDIT 1.9).
 * Тут лише orchestration:
 *  - applyArtifactPassiveEffects: ітерація equippedArtifacts
 *  - applyPassiveSkillEffects:    ітерація activeSkills з trigger=passive
 *  - getResistanceSkillIdsHighestOnly: highest-level skill on a line
 *    wins для resistance ефектів (інакше basic+advanced+expert
 *    стекалися б).
 */

import {
  ARTIFACT_EFFECT_ALL_ALLIES,
  ARTIFACT_EFFECT_ALL_ENEMIES,
} from "@/lib/constants/artifact-effect-scope";
import { SkillLevel } from "@/lib/types/skill-tree";
import {
  applyOnePassiveStatEffect,
  type PassiveResistanceContext,
} from "@/lib/utils/battle/participant/apply-passive-stat-effect";
import type {
  ActiveSkill,
  BattleParticipant,
  SkillEffect,
} from "@/types/battle";

export type { PassiveResistanceContext } from "./apply-passive-stat-effect";
export { applyOnePassiveStatEffect } from "./apply-passive-stat-effect";

const SKILL_LEVEL_RANK: Record<string, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

/** Скіли з резистом — лише найвищий рівень на лінію (mainSkillId). */
function getResistanceSkillIdsHighestOnly(
  activeSkills: ActiveSkill[],
): Set<string> {
  const byMainSkill = new Map<string, { skill: ActiveSkill; rank: number }>();

  for (const skill of activeSkills) {
    const hasResistance = (skill.effects ?? []).some(
      (e) =>
        e.stat === "physical_resistance" ||
        e.stat === "spell_resistance" ||
        e.stat === "all_resistance",
    );

    if (!hasResistance) continue;

    const key = skill.mainSkillId || skill.skillId;

    const rank = SKILL_LEVEL_RANK[skill.level ?? SkillLevel.BASIC] ?? 1;

    const existing = byMainSkill.get(key);

    if (!existing || rank > existing.rank) {
      byMainSkill.set(key, { skill, rank });
    }
  }

  return new Set([...byMainSkill.values()].map((v) => v.skill.skillId));
}

/**
 * Пасивні ефекти з `passiveAbility.effects` усіх екіпірованих артефактів.
 */
export function applyArtifactPassiveEffects(
  participant: BattleParticipant,
): void {
  const ctx: PassiveResistanceContext = { source: "artifact" };

  for (const artifact of participant.battleData.equippedArtifacts) {
    const aud = artifact.effectAudience;

    if (aud === ARTIFACT_EFFECT_ALL_ALLIES || aud === ARTIFACT_EFFECT_ALL_ENEMIES) {
      continue;
    }

    const raw = artifact.passiveAbility;

    if (!raw || typeof raw !== "object") continue;

    const effects = (raw as { effects?: SkillEffect[] }).effects;

    if (!Array.isArray(effects)) continue;

    for (const effect of effects) {
      if (!effect || typeof effect.stat !== "string") continue;

      applyOnePassiveStatEffect(participant, effect, ctx);
    }
  }
}

/**
 * Застосовує пасивні (trigger: "passive") ефекти скілів до учасника при ініціалізації.
 * Резисти враховуються лише з найвищого рівня скіла на лінію.
 */
export function applyPassiveSkillEffects(participant: BattleParticipant): void {
  const resistanceSkillIds = getResistanceSkillIdsHighestOnly(
    participant.battleData.activeSkills,
  );

  for (const skill of participant.battleData.activeSkills) {
    const isPassive = skill.skillTriggers?.some(
      (t) => t.type === "simple" && t.trigger === "passive",
    );

    if (!isPassive) continue;

    const ctx: PassiveResistanceContext = {
      source: "skill",
      skillId: skill.skillId,
      resistanceWinners: resistanceSkillIds,
    };

    for (const effect of skill.effects) {
      applyOnePassiveStatEffect(participant, effect, ctx);
    }
  }
}
