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
});
