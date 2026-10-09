import { describe, expect, it } from "vitest";

import { RACE_PASSIVES } from "@/data/library/race-passives";
import { AbilitySchema } from "@/lib/utils/abilities/schema";

const EXPECTED: Record<string, Record<string, number>> = {
  humans: { melee: 10 },
  demons: { melee: 15, ranged: -10 },
  elves: { ranged: 20, melee: -15 },
  "dark-elves": { melee: 15, magic: -10 },
  dwarves: { melee: 10, ranged: -10 },
  necromancers: { magic: 10, melee: -10 },
  mages: { magic: 15, melee: -20 },
};

describe("расові бонуси до шкоди", () => {
  it.each(Object.entries(EXPECTED))("%s", (race, expected) => {
    const style = RACE_PASSIVES[race].trait.find((a) => a.id === `${race}-fighting-style`);

    expect(style).toBeTruthy();
    expect(AbilitySchema.safeParse(style).success).toBe(true);
    expect(Object.fromEntries(style!.effects.map((e) => [(e as { filter: { kind: string } }).filter.kind, (e as { percent: number }).percent]))).toEqual(expected);
  });
});
