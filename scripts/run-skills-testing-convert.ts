/**
 * Конвертація Skill з БД → ActiveSkill для run-skills-testing
 */

import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, SkillEffect } from "@/types/battle";
import type { SimpleSkillTrigger } from "@/types/skill-triggers";

export type DbSkill = {
  id: string;
  name: string;
  mainSkillId: string | null;
  combatStats: unknown;
  bonuses: unknown;
  skillTriggers: unknown;
};

export function dbSkillToActiveSkill(skill: DbSkill): ActiveSkill {
  type RawEffect = {
    stat: string;
    type: string;
    value?: number | string | boolean;
    duration?: number;
  };
  type CombatStatsEffects = { effects?: RawEffect[] };

  const combatStats = (skill.combatStats as CombatStatsEffects) ?? {};

  const rawEffects = Array.isArray(combatStats.effects) ? combatStats.effects : [];

  let effects: SkillEffect[];

  if (rawEffects.length > 0) {
    effects = rawEffects
      .filter((e) => e.stat)
      .map((e) => ({
        stat: e.stat,
        type: e.type,
        value: e.value ?? 0,
        isPercentage: e.type === "percent",
        duration: e.duration,
      }));
  } else {
    const bonuses = (skill.bonuses as Record<string, number>) || {};

    const percentKeys = ["melee_damage", "ranged_damage", "counter_damage"];

    effects = Object.entries(bonuses).map(([key, value]) => ({
      stat: key,
      type: percentKeys.includes(key) || key.includes("percent") ? "percent" : "flat",
      value,
      isPercentage:
        key.includes("percent") || key.includes("_percent") || percentKeys.includes(key),
    }));
  }

  let skillTriggers: ActiveSkill["skillTriggers"];

  if (skill.skillTriggers && Array.isArray(skill.skillTriggers)) {
    skillTriggers = skill.skillTriggers as ActiveSkill["skillTriggers"];
  }

  return {
    skillId: skill.id,
    name: skill.name,
    mainSkillId: skill.mainSkillId ?? "",
    level: SkillLevel.BASIC,
    effects,
    skillTriggers,
  };
}

export function getPrimaryTrigger(skill: ActiveSkill): SimpleSkillTrigger | null {
  const triggers = skill.skillTriggers ?? [];

  for (const t of triggers) {
    if (t.type === "simple" && t.trigger) {
      return t.trigger as SimpleSkillTrigger;
    }
  }

  return null;
}
