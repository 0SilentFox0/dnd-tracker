import { describe, expect, it } from "vitest";

import { assignStandardArray, createRng, pointBuySpent, validateAbilityScores } from "@/lib/utils/characters/generate";

const s = (str: number, dex: number, con: number, int: number, wis: number, cha: number) => ({ strength: str, dexterity: dex, constitution: con, intelligence: int, wisdom: wis, charisma: cha });

describe("validateAbilityScores", () => {
  it("standard array in any order", () => {
    expect(validateAbilityScores(s(8, 10, 12, 13, 14, 15), "standard")).toBe(true);
    expect(validateAbilityScores(s(15, 15, 13, 12, 10, 8), "standard")).toBe(false);
  });

  it("point buy within 27 and 8..15", () => {
    expect(validateAbilityScores(s(15, 15, 15, 8, 8, 8), "pointBuy")).toBe(true);
    expect(pointBuySpent(s(15, 15, 15, 8, 8, 8))).toBe(27);
    expect(validateAbilityScores(s(15, 15, 15, 9, 8, 8), "pointBuy")).toBe(false);
    expect(validateAbilityScores(s(16, 8, 8, 8, 8, 8), "pointBuy")).toBe(false);
    expect(validateAbilityScores(s(18, 18, 18, 18, 18, 18), "pointBuy")).toBe(false);
  });
});

describe("assignStandardArray", () => {
  it("puts 15 on the archetype's primary ability", () => {
    const mage = assignStandardArray("mage", createRng(1));

    expect(mage.intelligence).toBe(15);
    expect(validateAbilityScores(mage, "standard")).toBe(true);
  });
});
