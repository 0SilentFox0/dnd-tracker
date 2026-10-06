import { describe, expect, it } from "vitest";

import { ABILITY_KEYS, ABILITY_LABELS, ABILITY_SCORES, ABILITY_SHORT_LABELS, CORE_ABILITY_SCORES } from "@/lib/constants/abilities";

describe("ABILITY_SCORES", () => {
  it("скорочення унікальні", () => {
    const abbreviations = ABILITY_SCORES.map((a) => a.abbreviation);

    expect(new Set(abbreviations).size).toBe(abbreviations.length);
  });
});

describe("основні характеристики", () => {
  it("ключі, мітки й короткі мітки узгоджені", () => {
    expect(CORE_ABILITY_SCORES.map((a) => a.key)).toEqual([...ABILITY_KEYS]);
    expect(ABILITY_LABELS.constitution).toBe("Статура");
    expect(ABILITY_SHORT_LABELS.wisdom).toBe("МУД");
  });
});
