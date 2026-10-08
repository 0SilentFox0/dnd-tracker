import type { BranchLevel, LearnedNode } from "@/lib/utils/skills/progression";

export type SpellCaster = { kind: "hero" | "unit"; level: number };

export type SpellDiceSource = { dice: number; groupId?: string | null };

export type MasteryOf = (groupId: string | null | undefined) => BranchLevel | null;

export type SpellDice = { count: number; sides: number; flat: number };

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

export function spellDice(caster: SpellCaster, spell: SpellDiceSource, masteryOf: MasteryOf): SpellDice {
  const level = Math.max(0, Math.floor(caster.level));

  const mastery = caster.kind === "hero" ? masteryOf(spell.groupId) : null;

  const count = spell.dice > 0 ? spell.dice + Math.floor(level / 3) : 0;

  return {
    count,
    sides: mastery ? SIDES_BY_MASTERY[mastery] : 6,
    flat: count > 0 ? level : 0,
  };
}

export function assertSpellDice(rolls: { count: number; sides: number }, expected: Pick<SpellDice, "count" | "sides">): boolean {
  return rolls.count === expected.count && rolls.sides === expected.sides;
}
