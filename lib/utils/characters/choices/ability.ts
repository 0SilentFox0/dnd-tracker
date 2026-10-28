import { type AbilityKey, isAbilityKey } from "@/lib/constants/abilities";
import { choiceIssue } from "@/lib/utils/characters/choices/validate";
import type { PickVisit } from "@/lib/utils/characters/choices/walk";
import type { ChoiceIssue } from "@/types/choices";

export interface AbilityPick {
  ability: AbilityKey;
  max: number;
}

export const abilityPicksOf = (visits: readonly PickVisit[]): AbilityPick[] =>
  visits.filter((v) => v.choice.kind === "abilityScore").flatMap((v) => v.picks.flatMap((p) => (isAbilityKey(p.id) ? [{ ability: p.id, max: v.choice.max ?? 20 }] : [])));

export function abilityScoreDelta(before: readonly AbilityPick[], after: readonly AbilityPick[]): Partial<Record<AbilityKey, number>> {
  const delta: Partial<Record<AbilityKey, number>> = {};

  for (const p of after) delta[p.ability] = (delta[p.ability] ?? 0) + 1;

  for (const p of before) delta[p.ability] = (delta[p.ability] ?? 0) - 1;

  return Object.fromEntries(Object.entries(delta).filter(([, v]) => v !== 0)) as Partial<Record<AbilityKey, number>>;
}

function addedPicks(before: readonly AbilityPick[], after: readonly AbilityPick[]): AbilityPick[] {
  const pool = [...before];

  return after.filter((p) => {
    const i = pool.findIndex((b) => b.ability === p.ability && b.max === p.max);

    if (i < 0) return true;

    pool.splice(i, 1);

    return false;
  });
}

export function capIssues(scores: Readonly<Record<AbilityKey, number>>, delta: Partial<Record<AbilityKey, number>>, after: readonly AbilityPick[], before: readonly AbilityPick[] = []): ChoiceIssue[] {
  const added = addedPicks(before, after);

  return (Object.entries(delta) as Array<[AbilityKey, number]>).flatMap(([ability, change]) => {
    if (change <= 0) return [];

    const forAbility = added.filter((p) => p.ability === ability);

    const cap = forAbility.length > 0 ? Math.max(...forAbility.map((p) => p.max)) : Math.min(...after.filter((p) => p.ability === ability).map((p) => p.max));

    return scores[ability] + change > cap ? [choiceIssue(`scores.${ability}`, "ABILITY_SCORE_CAP", `${scores[ability] + change} > ${cap}`)] : [];
  });
}

export const applyDelta = (scores: Readonly<Record<AbilityKey, number>>, delta: Partial<Record<AbilityKey, number>>): Partial<Record<AbilityKey, number>> =>
  Object.fromEntries((Object.entries(delta) as Array<[AbilityKey, number]>).map(([k, v]) => [k, scores[k] + v]));
