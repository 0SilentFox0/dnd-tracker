import type { AbilityKey } from "@/lib/constants/abilities";
import { type AbilityScores, recommendedPriority, rerecommendScores } from "@/lib/utils/characters/generate";
import type { CharacterFormData } from "@/types/characters";
import type { GameClassData } from "@/types/classes";

const priorityOf = (data: CharacterFormData, byId: Record<string, GameClassData>) => recommendedPriority({ cls: byId[data.basicInfo.classes?.[0]?.classId ?? ""], archetype: data.basicInfo.archetype });

const samePriority = (a: AbilityKey[] | null, b: AbilityKey[] | null) => (a === null || b === null ? a === b : a.join() === b.join());

export function withRecommendedScores(prev: CharacterFormData, next: CharacterFormData, byId: Record<string, GameClassData>): CharacterFormData {
  const before = priorityOf(prev, byId);

  const after = priorityOf(next, byId);

  if (samePriority(before, after)) return next;

  const { primaryAbility, ...scores } = next.abilityScores;

  const rec = rerecommendScores(scores as AbilityScores, before, after);

  if (!rec || !after) return next;

  return { ...next, abilityScores: { ...next.abilityScores, ...rec, primaryAbility: primaryAbility === null || primaryAbility === before?.[0] ? after[0] : primaryAbility } };
}
