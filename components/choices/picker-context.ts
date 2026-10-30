import type { PickerContext } from "./ChoicePicker";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { ChoiceRefsView } from "@/lib/hooks/characters";
import { abilityPicksOf, abilityScoreDelta } from "@/lib/utils/characters/choices/ability";
import { countFeats, skillFlags, skillPicksOf, visitPicks } from "@/lib/utils/characters/choices/walk";
import type { WizardStep } from "@/lib/utils/characters/choices/wizard";
import { maxSlotLevelFor } from "@/lib/utils/spells/class-slots";
import type { ChoiceHero, ChoiceIssue, ChoicesState } from "@/types/choices";
import type { CharacterClassEntry, GameClassData } from "@/types/classes";

export const issueFor = (issues: ChoiceIssue[] | undefined, path: string) => issues?.find((i) => i.path === path || i.path.startsWith(`${path}.`))?.message;

export type PickerBase = Omit<PickerContext, "level" | "columns" | "maxSlotLevel">;

/** `saved` — вибори, чий приріст уже входить у hero.scores */
export function pickerBase(data: ChoicesState, refs: ChoiceRefsView, hero: ChoiceHero, saved?: ChoicesState): PickerBase {
  const heroCtx = { level: hero.level, classMode: hero.classMode };

  const visits = visitPicks(data, refs, heroCtx);

  const delta = abilityScoreDelta(saved ? abilityPicksOf(visitPicks(saved, refs, heroCtx)) : [], abilityPicksOf(visits));

  return {
    totalLevel: hero.level,
    feats: refs.feats,
    featsById: refs.featsById,
    spells: refs.spells,
    proficient: new Set([...(data.backgroundId ? refs.backgroundsById?.[data.backgroundId]?.skillProficiencies ?? [] : []), ...skillFlags(hero.skills), ...skillPicksOf(visits, "skill")]),
    scores: hero.scores,
    scoreAfter: Object.fromEntries(ABILITY_KEYS.map((k) => [k, hero.scores[k] + (delta[k] ?? 0)])) as Record<AbilityKey, number>,
    featCounts: countFeats(visits, data, hero.classMode),
  };
}

export function classPickerContext(base: PickerBase, cls: GameClassData, entry: CharacterClassEntry): PickerContext {
  const subclass = cls.subclasses.find((s) => s.id === entry.subclassId) ?? null;

  return { ...base, level: entry.level, columns: cls.columns ?? [], maxSlotLevel: maxSlotLevelFor({ ...entry, class: cls, subclass }) };
}

export function pickerContextFor(base: PickerBase, step: WizardStep, data: ChoicesState, refs: ChoiceRefsView, heroLevel: number): PickerContext {
  const entry = step.classId ? data.classes.find((e) => e.classId === step.classId) : undefined;

  const cls = entry && refs.classesById[entry.classId];

  return entry && cls ? classPickerContext(base, cls, entry) : { ...base, level: heroLevel, maxSlotLevel: 0 };
}
