import type { RollStep } from "./useRollReveal";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { Locale } from "@/lib/i18n/config";
import { type AbilityScores, archetypeClasses, pick, STANDARD_ARRAY } from "@/lib/utils/characters/generate";
import type { DraftInput } from "@/types/characters";

export type RollKey = "race" | "avatar" | "archetype" | "class" | "alignment" | "name" | "background" | AbilityKey;

export const standardScores = (): AbilityScores => Object.fromEntries(ABILITY_KEYS.map((k, i) => [k, STANDARD_ARRAY[i]])) as AbilityScores;

export const emptyDraft = (locale: Locale): DraftInput => ({ name: "", race: "", class: archetypeClasses(locale).warrior, archetype: "warrior", method: "standard", ...standardScores(), goals: [] });

export const scoresOf = (v: DraftInput): AbilityScores => Object.fromEntries(ABILITY_KEYS.map((k) => [k, v[k]])) as AbilityScores;

export const scoreSteps = (scores: AbilityScores): Array<RollStep<RollKey>> => ABILITY_KEYS.map((key) => ({ key, pool: () => pick(Math.random, STANDARD_ARRAY), final: scores[key] }));

export const backgroundStep = (background: string): RollStep<RollKey> => ({ key: "background", pool: () => "", final: background });

export const avatarStep = (url: string, pool: string[]): RollStep<RollKey> => ({ key: "avatar", pool: () => pick(Math.random, pool), final: url });
