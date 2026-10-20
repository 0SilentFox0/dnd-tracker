import type { BranchLevel, LearnedNode } from "@/lib/utils/skills/progression";

export type SpellCaster = { kind: "hero" | "unit"; level: number };

export type SpellDiceSource = { dice: number; groupId?: string | null };

export type MasteryOf = (groupId: string | null | undefined) => BranchLevel | null;

export type SpellDice = { count: number; sides: number };

const SIDES_BY_MASTERY: Record<BranchLevel, number> = { basic: 6, advanced: 8, expert: 10 };

const MASTERY_ORDER: Record<BranchLevel, number> = { basic: 1, advanced: 2, expert: 3 };

export function schoolMasteryFromLearned(learned: LearnedNode[], branchSpellGroup: Record<string, string | null>): MasteryOf {
  const byGroup = new Map<string, BranchLevel>();

  for (const node of learned) {
    if (node.kind !== "branchLevel" || !node.branchId || !node.level) continue;

    const group = branchSpellGroup[node.branchId];

    if (!group) continue;

    const current = byGroup.get(group);

    if (!current || MASTERY_ORDER[node.level] > MASTERY_ORDER[current]) byGroup.set(group, node.level);
  }

  return (groupId) => (groupId ? (byGroup.get(groupId) ?? null) : null);
}

// юніти не мають майстерності шкіл: грані ростуть з рівнем, а кубики — швидше, ніж у героя
const unitSides = (level: number) => (level >= 10 ? 10 : level >= 5 ? 8 : 6);

export function spellDice(caster: SpellCaster, spell: SpellDiceSource, masteryOf: MasteryOf): SpellDice {
  const level = Math.max(0, Math.floor(caster.level));

  if (caster.kind === "unit") return { count: spell.dice > 0 ? spell.dice + Math.floor(level / 2) : 0, sides: unitSides(level) };

  const mastery = masteryOf(spell.groupId);

  return {
    count: spell.dice > 0 ? spell.dice + Math.floor(level / 3) : 0,
    sides: mastery ? SIDES_BY_MASTERY[mastery] : 6,
  };
}
