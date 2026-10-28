import "server-only";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { loadChoiceRefs } from "@/lib/server/characters/choices/load-refs";
import { characterClassMode } from "@/lib/server/characters/choices/resolve-choices";
import { abilityPicksOf, abilityScoreDelta } from "@/lib/utils/characters/choices/ability";
import { choicesStateOf, storedDraftChoices } from "@/lib/utils/characters/choices/picks";
import { visitPicks } from "@/lib/utils/characters/choices/walk";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { DraftInput } from "@/types/characters";

type DraftRow = { backgroundId?: string | null; backgroundChoices?: unknown; backgroundFeatPicks?: unknown; campaignId: string; race: string; raceChoices: unknown; feats: unknown; classes: unknown } & Record<AbilityKey, number>;

/** Форма чернетки показує базові бали: збережені вже містять приріст від піків, сервер додасть його знову при збереженні. */
export async function draftEditInitial(row: DraftRow, rules: Ruleset): Promise<{ choices: DraftInput["choices"] | undefined; scores: Record<AbilityKey, number> }> {
  const stored = Object.fromEntries(ABILITY_KEYS.map((k) => [k, row[k]])) as Record<AbilityKey, number>;

  const state = choicesStateOf(row);

  const choices = storedDraftChoices(row, row.race, state.classes[0]?.classId);

  if (!choices) return { choices, scores: stored };

  const classMode = characterClassMode(rules, state.classes);

  const refs = await loadChoiceRefs(row.campaignId, row.race, { classMode, backgroundIds: [state.backgroundId] });

  const delta = abilityScoreDelta([], abilityPicksOf(visitPicks(state, refs, { level: 1, classMode })));

  return { choices, scores: Object.fromEntries(ABILITY_KEYS.map((k) => [k, stored[k] - (delta[k] ?? 0)])) as Record<AbilityKey, number> };
}
