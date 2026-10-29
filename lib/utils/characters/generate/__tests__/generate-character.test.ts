import { describe, expect, it } from "vitest";

import { createRng, generateCharacter, generateName, GENERATOR_POOLS, validateAbilityScores } from "@/lib/utils/characters/generate";

describe("generateCharacter", () => {
  it("is deterministic for a seed", () => {
    expect(generateCharacter({ races: ["Люди", "Ельфи"], seed: 42 })).toEqual(generateCharacter({ races: ["Люди", "Ельфи"], seed: 42 }));
  });

  it("uses a campaign race and valid scores", () => {
    for (let seed = 0; seed < 50; seed++) {
      const c = generateCharacter({ races: ["Орки"], seed });

      expect(c.race).toBe("Орки");
      expect(validateAbilityScores(c.scores, "standard")).toBe(true);
      expect(c.name.length).toBeGreaterThan(1);
      expect(c.background.length).toBeGreaterThan(20);
      expect(c.goals.length).toBeGreaterThan(0);
      expect(GENERATOR_POOLS.alignments).toContain(c.alignment);
    }
  });

  it("works with no campaign races", () => {
    expect(generateCharacter({ races: [], seed: 1 }).race).toBe("");
  });

  it("names unknown races from the generic table", () => {
    expect(generateName("Невідомі", createRng(3)).length).toBeGreaterThan(1);
  });

  describe("class mode", () => {
    const classes = [
      { id: "wiz", name: "Чародій-тест", spellcastingAbility: "intelligence" as const, savingThrows: ["intelligence" as const, "wisdom" as const] },
      { id: "fig", name: "Боєць-тест", spellcastingAbility: null, savingThrows: ["strength" as const, "constitution" as const] },
    ];

    it("picks a campaign class and prioritises spellcasting ability, then saves", () => {
      for (let seed = 0; seed < 40; seed++) {
        const c = generateCharacter({ races: ["Орки"], seed, classes });

        const cls = classes.find((x) => x.id === c.classId) ?? classes[0];

        expect(c.class).toBe(cls.name);
        expect(validateAbilityScores(c.scores, "standard")).toBe(true);

        if (cls.id === "wiz") {
          expect([c.scores.intelligence, c.scores.wisdom]).toEqual([15, 14]);
          expect(c.primaryAbility).toBe("intelligence");
        } else {
          expect([c.scores.strength, c.scores.constitution]).toEqual([15, 14]);
        }
      }
    });

    it("leaves classId unset without classes", () => {
      expect(generateCharacter({ races: [], seed: 5 }).classId).toBeUndefined();
    });
  });
});

describe("generateCharacter locales", () => {
  const CYR = /\p{Script=Cyrillic}/u;

  const RACES = ["Humans", "Orcs", "Dark Elves", "Elves", "Gnomes", "Undead", "Demons", "Mages", "Unknown"];

  it("en output has no Cyrillic and matches the uk structure", () => {
    for (let seed = 0; seed < 60; seed++) {
      const en = generateCharacter({ races: RACES, seed, locale: "en" });

      const uk = generateCharacter({ races: RACES, seed, locale: "uk" });

      expect(JSON.stringify(en)).not.toMatch(CYR);
      expect(en.archetype).toBe(uk.archetype);
      expect(en.scores).toEqual(uk.scores);
      expect(en.goals.map((g) => g.kind)).toEqual(uk.goals.map((g) => g.kind));
      expect(en.background.split(". ").length).toBe(uk.background.split(". ").length);
    }
  });

  it("uk stays the default", () => {
    expect(generateCharacter({ races: ["Люди"], seed: 7 })).toEqual(generateCharacter({ races: ["Люди"], seed: 7, locale: "uk" }));
  });

  it("en names and tables mirror uk shapes", async () => {
    const { NAME_TABLES_EN } = await import("../names.en");

    const { NAME_TABLES_UK } = await import("../names.uk");

    const { BACKSTORY_EN } = await import("../backstory.en");

    const { BACKSTORY_UK } = await import("../backstory.uk");

    expect(NAME_TABLES_EN.map((t) => [t.first.length, t.second.length])).toEqual(NAME_TABLES_UK.map((t) => [t.first.length, t.second.length]));
    expect(BACKSTORY_EN.origin).toHaveLength(BACKSTORY_UK.origin.length);
    expect(BACKSTORY_EN.drive).toHaveLength(BACKSTORY_UK.drive.length);
    expect(BACKSTORY_EN.mainGoals).toHaveLength(BACKSTORY_UK.mainGoals.length);
    expect(BACKSTORY_EN.personalGoals).toHaveLength(BACKSTORY_UK.personalGoals.length);

    for (const k of Object.keys(BACKSTORY_UK.turn) as Array<keyof typeof BACKSTORY_UK.turn>) expect(BACKSTORY_EN.turn[k]).toHaveLength(BACKSTORY_UK.turn[k].length);
  });
});
