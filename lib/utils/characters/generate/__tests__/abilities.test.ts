import { describe, expect, it } from "vitest";

import { assignStandardArray, createRng, isUntouchedScores, pointBuySpent, recommendedPriority, recommendedScores, validateAbilityScores } from "@/lib/utils/characters/generate";

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

describe("recommendedScores", () => {
  it("puts the standard array on the priority abilities first, rest in fixed order", () => {
    const wizard = recommendedScores(["intelligence", "wisdom"]);

    expect(wizard).toEqual(s(8, 12, 13, 15, 14, 10));
    expect(validateAbilityScores(wizard, "standard")).toBe(true);
  });

  it("is deterministic and tolerates an empty priority", () => {
    expect(recommendedScores([])).toEqual(recommendedScores([]));
    expect(validateAbilityScores(recommendedScores([]), "standard")).toBe(true);
  });
});

describe("recommendedPriority", () => {
  it("uses class saves and casting ability, falling back to the archetype", () => {
    expect(recommendedPriority({ cls: { spellcastingAbility: "intelligence", savingThrows: ["intelligence", "wisdom"] } })).toEqual(["intelligence", "wisdom"]);
    expect(recommendedPriority({ archetype: "rogue" })).toEqual(["dexterity", "intelligence"]);
    expect(recommendedPriority({ archetype: "" })).toBeNull();
  });
});

describe("isUntouchedScores", () => {
  it("is true for defaults and for the previous recommendation only", () => {
    expect(isUntouchedScores(s(10, 10, 10, 10, 10, 10), null)).toBe(true);
    expect(isUntouchedScores(recommendedScores(["strength"]), ["strength"])).toBe(true);
    expect(isUntouchedScores(recommendedScores(["strength"]), ["dexterity"])).toBe(false);
    expect(isUntouchedScores(s(10, 10, 10, 10, 10, 11), null)).toBe(false);
  });
});
