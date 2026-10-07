import { getSpellLevelsForSkillLevel, SKILL_LEVEL_ORDER, type SpellSkillInfo } from "./spell-learning-internals";

import type { BranchLevel, LearnedNode } from "@/lib/utils/skills/progression";
import type { SkillLevelType } from "@/types/skill-tree";

export function learnedSpellIdsFromNodes(
  learned: LearnedNode[],
  ctx: {
    branchSpellGroup: Record<string, string | null>;
    skills: Record<string, SpellSkillInfo>;
    spells: Array<{ id: string; level: number; spellGroup?: { id: string } | null }>;
  },
): string[] {
  const groupLevel = new Map<string, BranchLevel>();

  const extra = new Set<string>();

  const raise = (group: string | null | undefined, level: BranchLevel) => {
    if (!group) return;

    const current = groupLevel.get(group);

    if (!current || SKILL_LEVEL_ORDER[level] > SKILL_LEVEL_ORDER[current]) groupLevel.set(group, level);
  };

  for (const node of learned) {
    if (node.kind === "branchLevel" && node.branchId && node.level) raise(ctx.branchSpellGroup[node.branchId], node.level);

    const skill = node.skillId ? ctx.skills[node.skillId] : undefined;

    if (skill) {
      raise(skill.spellGroupId, "basic");

      if (skill.newSpellId) extra.add(skill.newSpellId);
    }
  }

  const result = new Set(extra);

  for (const [group, level] of groupLevel) {
    const levels = getSpellLevelsForSkillLevel(level as SkillLevelType);

    ctx.spells.filter((s) => s.spellGroup?.id === group && levels.includes(s.level)).forEach((s) => result.add(s.id));
  }

  return [...result];
}
