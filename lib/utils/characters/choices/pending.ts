import type { ChoiceRefs, PickVisit } from "@/lib/utils/characters/choices/walk";

function resolved(v: PickVisit, refs: Pick<ChoiceRefs, "featsById">): number {
  if (v.choice.kind === "option") return v.picks.filter((p) => v.choice.options?.some((o) => o.id === p.id)).length;

  if (v.choice.kind === "feat") return v.picks.filter((p) => refs.featsById[p.id] || v.choice.options?.some((o) => o.id === p.id)).length;

  return v.picks.length;
}

const unreachable = (v: PickVisit): boolean => {
  const rule = v.choice.spells;

  return v.choice.kind === "spell" && !!rule && rule.maxLevel === "slots" && v.maxSlotLevel !== undefined && rule.minLevel > v.maxSlotLevel;
};

export const pendingCount = (visits: readonly PickVisit[], refs: Pick<ChoiceRefs, "featsById">): number =>
  visits.filter((v) => v.open && !unreachable(v)).reduce((sum, v) => sum + Math.max(0, v.target - resolved(v, refs)), 0);
