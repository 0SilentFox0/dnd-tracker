import { describe, expect, it } from "vitest";

import { ABILITY_KEYS, ABILITY_SCORES, abilityScoreTermKey, CORE_ABILITY_SCORES } from "@/lib/constants/abilities";

describe("ABILITY_SCORES", () => {
  it("скорочення унікальні", () => {
    const abbreviations = ABILITY_SCORES.map((a) => a.abbreviation);

    expect(new Set(abbreviations).size).toBe(abbreviations.length);
  });
});

describe("основні характеристики", () => {
  it("ключі збігаються з ABILITY_KEYS, ключ терміна — у gameTerms", () => {
    expect(CORE_ABILITY_SCORES.map((a) => a.key)).toEqual([...ABILITY_KEYS]);
    expect(abilityScoreTermKey("constitution")).toBe("abilities.constitution.label");
    expect(abilityScoreTermKey("moral")).toBe("stats.moral");
  });
});
