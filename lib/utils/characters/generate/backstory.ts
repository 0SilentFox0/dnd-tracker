import { BACKSTORY_EN } from "./backstory.en";
import { BACKSTORY_UK } from "./backstory.uk";
import { pick } from "./rng";

import { GoalKind } from "@/lib/constants/characters";
import type { HeroArchetypeKey } from "@/lib/constants/hero-archetypes";
import type { Locale } from "@/lib/i18n/config";

const TABLES = { uk: BACKSTORY_UK, en: BACKSTORY_EN };

export function generateBackstory(
  input: { name: string; raceName: string; archetype: HeroArchetypeKey },
  rng: () => number,
  locale: Locale = "uk",
): { background: string; goals: Array<{ text: string; kind: GoalKind }> } {
  const table = TABLES[locale];

  const origin = pick(rng, table.origin)({ name: input.name, place: table.place(input.raceName) });

  const turn = pick(rng, table.turn[input.archetype]);

  const drive = pick(rng, table.drive);

  return {
    background: [origin, turn, drive].join(" "),
    goals: [
      { kind: GoalKind.MAIN, text: pick(rng, table.mainGoals) },
      { kind: GoalKind.PERSONAL, text: pick(rng, table.personalGoals) },
    ],
  };
}
