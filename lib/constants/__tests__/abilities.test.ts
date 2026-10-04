import { describe, expect, it } from "vitest";

import { ABILITY_SCORES } from "@/lib/constants/abilities";

describe("ABILITY_SCORES", () => {
  it("скорочення унікальні", () => {
    const abbreviations = ABILITY_SCORES.map((a) => a.abbreviation);

    expect(new Set(abbreviations).size).toBe(abbreviations.length);
  });
});
