import { type AbilityScores, ARCHETYPE_CLASS, ARCHETYPE_PRIMARY, assignStandardArray } from "./abilities";
import { generateBackstory } from "./backstory";
import { generateName } from "./names";
import { createRng, pick } from "./rng";

import { type AbilityKey } from "@/lib/constants/abilities";
import { ALIGNMENTS } from "@/lib/constants/alignment";
import type { GoalKind } from "@/lib/constants/characters";
import { HERO_ARCHETYPE_KEYS, type HeroArchetypeKey } from "@/lib/constants/hero-archetypes";

export interface GeneratedCharacter {
  name: string;
  race: string;
  archetype: HeroArchetypeKey;
  class: string;
  alignment: string;
  method: "standard";
  scores: AbilityScores;
  primaryAbility: AbilityKey;
  background: string;
  goals: Array<{ text: string; kind: GoalKind }>;
}

export const GENERATOR_POOLS = {
  alignments: ALIGNMENTS,
  archetypes: HERO_ARCHETYPE_KEYS,
  classes: HERO_ARCHETYPE_KEYS.map((k) => ARCHETYPE_CLASS[k]),
} as const;

export function generateCharacter({ races, seed }: { races: string[]; seed: number }): GeneratedCharacter {
  const rng = createRng(seed);

  const race = races.length ? pick(rng, races) : "";

  const archetype = pick(rng, HERO_ARCHETYPE_KEYS);

  const name = generateName(race, rng);

  const scores = assignStandardArray(archetype, rng);

  const story = generateBackstory({ name, raceName: race, archetype }, rng);

  return {
    name,
    race,
    archetype,
    class: ARCHETYPE_CLASS[archetype],
    alignment: pick(rng, ALIGNMENTS),
    method: "standard",
    scores,
    primaryAbility: ARCHETYPE_PRIMARY[archetype][0],
    ...story,
  };
}
