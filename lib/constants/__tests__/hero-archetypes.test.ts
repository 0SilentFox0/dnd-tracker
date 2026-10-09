import { describe, expect, it } from "vitest";

import { HERO_ARCHETYPE_OPTIONS, heroArchetype } from "@/lib/constants/hero-archetypes";

describe("heroArchetype", () => {
  it("null і невідоме — Універсал 10/1/1/1", () => {
    expect(heroArchetype(null)).toMatchObject({ name: "Універсал", hpPerLevel: 10, melee: 1, ranged: 1, magic: 1 });
    expect(heroArchetype("x").name).toBe("Універсал");
  });

  it("значення зі спеки", () => {
    expect(heroArchetype("ranger")).toMatchObject({ hpPerLevel: 9, melee: 0.7, ranged: 1.5, magic: 0.7 });
    expect(HERO_ARCHETYPE_OPTIONS.map((o) => o.value)).toEqual(["", "warrior", "paladin", "ranger", "rogue", "mage"]);
  });
});
