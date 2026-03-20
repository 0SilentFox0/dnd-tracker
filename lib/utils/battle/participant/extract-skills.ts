/**
 * Витягування активних скілів з character.skillTreeProgress та characterSkills
 */

import type { Prisma } from "@prisma/client";

import type { CharacterFromPrisma } from "../types/participant";
import {
  inferLevelFromSkillName,
  parseMainSkillLevelId,
} from "./parse";

import { prisma } from "@/lib/db";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, SkillEffect } from "@/types/battle";
import type { SkillTriggers } from "@/types/skill-triggers";

/**
 * Витягує активні скіли з character. Розв'язує id рівнів (mainSkillId_expert_level) у реальні скіли.
 */
export async function extractActiveSkillsFromCharacter(
  character: CharacterFromPrisma,
  campaignId: string,
  preloadedSkillsById?: Record<string, Prisma.SkillGetPayload<object>>,
): Promise<ActiveSkill[]> {
  const activeSkills: ActiveSkill[] = [];

  const skillTreeProgress =
    (character.skillTreeProgress as Record<
      string,
      { level?: SkillLevel; unlockedSkills?: string[] }
    >) || {};

  const allSkillIds: string[] = [];

  const skillIdToMainSkill: Record<string, string> = {};

  const skillIdToLevel: Record<string, SkillLevel> = {};

  for (const [mainSkillId, progress] of Object.entries(skillTreeProgress)) {
    if (!progress.unlockedSkills || progress.unlockedSkills.length === 0) {
      continue;
    }

    for (const skillId of progress.unlockedSkills) {
      allSkillIds.push(skillId);
      skillIdToMainSkill[skillId] = mainSkillId;
      skillIdToLevel[skillId] = progress.level || SkillLevel.BASIC;
    }
  }

  const personalSkillId = (character as { personalSkillId?: string | null })
    .personalSkillId;

  if (personalSkillId?.trim() && !allSkillIds.includes(personalSkillId)) {
    allSkillIds.push(personalSkillId);
    skillIdToMainSkill[personalSkillId] = "";
    skillIdToLevel[personalSkillId] = SkillLevel.BASIC;
  }

  if (allSkillIds.length === 0) {
    return activeSkills;
  }

  const directIds = allSkillIds.filter((id) => !parseMainSkillLevelId(id));

  const levelIds = allSkillIds.filter((id) => parseMainSkillLevelId(id));

  const mainSkillIdsFromLevels = new Set(
    levelIds
      .map(parseMainSkillLevelId)
      .filter((p): p is { mainSkillId: string; level: string } => p != null)
      .map((p) => p.mainSkillId),
  );

  let fetchedSkills: Prisma.SkillGetPayload<object>[];

  if (preloadedSkillsById) {
    const byDirect = directIds
      .map((id) => preloadedSkillsById[id])
      .filter(Boolean);

    const byMainSkill = Object.values(preloadedSkillsById).filter(
      (s) =>
        mainSkillIdsFromLevels.size > 0 &&
        s.mainSkillId &&
        mainSkillIdsFromLevels.has(s.mainSkillId),
    );

    fetchedSkills = [
      ...new Map([...byDirect, ...byMainSkill].map((s) => [s.id, s])).values(),
    ];
  } else {
    const orConditions: Array<
      { id: { in: string[] } } | { mainSkillId: { in: string[] } }
    > = [];

    if (directIds.length > 0) orConditions.push({ id: { in: directIds } });

    if (mainSkillIdsFromLevels.size > 0) {
      orConditions.push({
        mainSkillId: { in: Array.from(mainSkillIdsFromLevels) },
      });
    }

    fetchedSkills = orConditions.length
      ? await prisma.skill.findMany({
          where: { campaignId, OR: orConditions },
        })
      : [];
  }

  const skillsMap = new Map<string, Prisma.SkillGetPayload<object>>();

  for (const s of fetchedSkills) {
    skillsMap.set(s.id, s);
  }

  for (const levelId of levelIds) {
    const parsed = parseMainSkillLevelId(levelId);

    if (!parsed) continue;

    const match = fetchedSkills.find((s) => {
      const msId =
        s.mainSkillId ??
        (s.mainSkillData as { mainSkillId?: string } | undefined)?.mainSkillId;

      if (msId !== parsed.mainSkillId) return false;

      return inferLevelFromSkillName(s.name) === parsed.level;
    });

    if (match) skillsMap.set(levelId, match);
  }

  type RawEffect = {
    stat: string;
    type: string;
    value?: number | string | boolean;
    duration?: number;
    target?: "self" | "enemy" | "all_enemies" | "all_allies" | "all";
    maxTriggers?: number | null;
  };
  type CombatStatsEffects = {
    effects?: RawEffect[];
    affectsDamage?: boolean;
    damageType?: "melee" | "ranged" | "magic" | null;
  };

  for (const skillId of allSkillIds) {
    const skill = skillsMap.get(skillId);

    if (!skill) {
      activeSkills.push({
        skillId,
        name: `Unknown Skill (${skillId})`,
        mainSkillId: skillIdToMainSkill[skillId],
        level: skillIdToLevel[skillId],
        effects: [],
        spellEnhancements: undefined,
      });
      continue;
    }

    const combatStats = (skill.combatStats as CombatStatsEffects) ?? {};

    const rawEffects = Array.isArray(combatStats.effects)
      ? combatStats.effects
      : [];

    let effects: SkillEffect[];

    if (rawEffects.length > 0) {
      effects = rawEffects
        .filter((e) => e.stat || (e as { type?: string }).type)
        .map((e) => {
          const raw = e as RawEffect & { isPercentage?: boolean };

          const isPct =
            raw.isPercentage === true ||
            e.type === "percent" ||
            e.type === "percentage";

          const stat = e.stat || (e as { type?: string }).type || "";

          return {
            stat,
            type: e.type || "flat",
            value: e.value ?? 0,
            isPercentage: isPct,
            duration: e.duration,
            ...(raw.target != null && { target: raw.target }),
            ...(raw.maxTriggers != null && { maxTriggers: raw.maxTriggers }),
          };
        });
    } else {
      const bonuses = (skill.bonuses as Record<string, number>) || {};

      const percentKeys = ["melee_damage", "ranged_damage", "counter_damage"];

      effects = Object.entries(bonuses).map(([key, value]) => ({
        stat: key,
        type:
          percentKeys.includes(key) || key.includes("percent")
            ? "percent"
            : "flat",
        value,
        isPercentage:
          key.includes("percent") ||
          key.includes("_percent") ||
          percentKeys.includes(key),
      }));
    }

    let spellEnhancements: ActiveSkill["spellEnhancements"] | undefined;

    const enhancementTypes = (skill.spellEnhancementTypes as string[]) || [];

    const enhancementDataRaw =
      skill.spellEnhancementData &&
      typeof skill.spellEnhancementData === "object" &&
      !Array.isArray(skill.spellEnhancementData)
        ? (skill.spellEnhancementData as {
            spellAllowMultipleTargets?: boolean;
            spellAoeSpellIds?: unknown;
          })
        : {};

    const spellAllowMultipleTargetsFromJson =
      enhancementDataRaw.spellAllowMultipleTargets === true;

    const spellAoeSpellIdsFromJson = Array.isArray(
      enhancementDataRaw.spellAoeSpellIds,
    )
      ? enhancementDataRaw.spellAoeSpellIds.filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        )
      : [];

    if (
      enhancementTypes.length > 0 ||
      skill.spellEffectIncrease ||
      skill.spellTargetChange ||
      skill.spellAdditionalModifier ||
      skill.spellNewSpellId ||
      spellAllowMultipleTargetsFromJson ||
      spellAoeSpellIdsFromJson.length > 0
    ) {
      spellEnhancements = {};

      if (skill.spellEffectIncrease) {
        spellEnhancements.spellEffectIncrease = skill.spellEffectIncrease;
      }

      if (skill.spellTargetChange) {
        const targetChange = skill.spellTargetChange as unknown as {
          target: string;
        };

        if (
          targetChange &&
          typeof targetChange === "object" &&
          "target" in targetChange
        ) {
          spellEnhancements.spellTargetChange = {
            target: targetChange.target,
          };
        }
      }

      if (skill.spellAdditionalModifier) {
        const additionalModifier = skill.spellAdditionalModifier as unknown as {
          modifier?: string;
          damageDice?: string;
          duration?: number;
        };

        if (additionalModifier && typeof additionalModifier === "object") {
          spellEnhancements.spellAdditionalModifier = {
            modifier: additionalModifier.modifier,
            damageDice: additionalModifier.damageDice,
            duration: additionalModifier.duration,
          };
        }
      }

      if (skill.spellNewSpellId) {
        spellEnhancements.spellNewSpellId = skill.spellNewSpellId;
      }

      if (spellAllowMultipleTargetsFromJson) {
        spellEnhancements.spellAllowMultipleTargets = true;
      }

      if (spellAoeSpellIdsFromJson.length > 0) {
        spellEnhancements.spellAoeSpellIds = spellAoeSpellIdsFromJson;
      }
    }

    let skillTriggers: SkillTriggers | undefined;

    const skillTriggersValue = (skill as Record<string, unknown>).skillTriggers;

    if (skillTriggersValue && Array.isArray(skillTriggersValue)) {
      skillTriggers = skillTriggersValue as SkillTriggers;
    }

    let resolvedDamageType: "melee" | "ranged" | "magic" | null =
      (combatStats.damageType as "melee" | "ranged" | "magic" | null) ?? null;

    const hasRanged = effects.some((e) => e.stat === "ranged_damage");

    const hasMelee = effects.some((e) => e.stat === "melee_damage");

    if (resolvedDamageType == null || !resolvedDamageType.length) {
      if (hasRanged && !hasMelee) resolvedDamageType = "ranged";
      else if (hasMelee && !hasRanged) resolvedDamageType = "melee";
      else if (hasRanged) resolvedDamageType = "ranged";
      else if (hasMelee) resolvedDamageType = "melee";
    } else if (hasRanged && !hasMelee && resolvedDamageType === "melee") {
      resolvedDamageType = "ranged";
    } else if (hasMelee && !hasRanged && resolvedDamageType === "ranged") {
      resolvedDamageType = "melee";
    }

    const resolvedLevel =
      (inferLevelFromSkillName(skill.name) as SkillLevel | null) ??
      skillIdToLevel[skillId] ??
      SkillLevel.BASIC;

    activeSkills.push({
      skillId: skill.id,
      name: skill.name,
      mainSkillId: skill.mainSkillId ?? skillIdToMainSkill[skillId] ?? "",
      level: resolvedLevel,
      icon: skill.icon ?? undefined,
      description: skill.description ?? undefined,
      effects,
      affectsDamage: combatStats.affectsDamage,
      damageType: resolvedDamageType,
      linkedSpellId: skill.spellId ?? undefined,
      spellEnhancements,
      skillTriggers,
    });
  }

  return activeSkills;
}
