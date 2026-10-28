import type { ChoiceRefs, PickVisit } from "@/lib/utils/characters/choices/walk";
import type { Choice, ChoicePick, FeatData } from "@/types/choices";

export function resolvedPickCount(choice: Choice, picks: readonly ChoicePick[], featsById?: Readonly<Record<string, FeatData>>): number {
  if (choice.kind === "option") return picks.filter((p) => choice.options?.some((o) => o.id === p.id)).length;

  if (choice.kind === "feat" && featsById) return picks.filter((p) => featsById[p.id] || choice.options?.some((o) => o.id === p.id)).length;

  return picks.length;
}

const resolved = (v: PickVisit, refs: Pick<ChoiceRefs, "featsById">): number => resolvedPickCount(v.choice, v.picks, refs.featsById);

const unreachable = (v: PickVisit): boolean => {
  const rule = v.choice.spells;

  return v.choice.kind === "spell" && !!rule && rule.maxLevel === "slots" && v.maxSlotLevel !== undefined && rule.minLevel > v.maxSlotLevel;
};

export const pendingCount = (visits: readonly PickVisit[], refs: Pick<ChoiceRefs, "featsById">): number =>
  visits.filter((v) => v.open && !unreachable(v)).reduce((sum, v) => sum + Math.max(0, v.target - resolved(v, refs)), 0);
