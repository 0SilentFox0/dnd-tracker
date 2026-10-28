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
