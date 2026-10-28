import { describe, expect, it } from "vitest";

import { setupXpBudget } from "@/lib/utils/battle/balance/setup";
import { computeXpBudget, encounterMultiplier, isXpDifficultyOf, partyThresholds, pickXpRoster } from "@/lib/utils/battle/balance/xp-budget";

const party = (n: number, level: number) => Array.from({ length: n }, () => level);

describe("пороги", () => {
  it("2014 (DMG): легкий / середній / складний / смертельний на героя", () => {
    expect(partyThresholds("2014", [1])).toEqual({ easy: 25, medium: 50, hard: 75, deadly: 100 });
    expect(partyThresholds("2014", [5])).toEqual({ easy: 250, medium: 500, hard: 750, deadly: 1100 });
    expect(partyThresholds("2014", [11])).toEqual({ easy: 800, medium: 1600, hard: 2400, deadly: 3600 });
    expect(partyThresholds("2014", [20])).toEqual({ easy: 2800, medium: 5700, hard: 8500, deadly: 12700 });
    expect(partyThresholds("2014", party(4, 3))).toEqual({ easy: 300, medium: 600, hard: 900, deadly: 1600 });
  });

  it("2024 (DMG): низька / помірна / висока на героя; рівень обрізається до 1–20", () => {
    expect(partyThresholds("2024", [1])).toEqual({ low: 50, moderate: 75, high: 100 });
    expect(partyThresholds("2024", [10])).toEqual({ low: 1600, moderate: 2300, high: 3100 });
    expect(partyThresholds("2024", [20])).toEqual({ low: 6400, moderate: 13200, high: 22000 });
    expect(partyThresholds("2024", [0, 25])).toEqual({ low: 6450, moderate: 13275, high: 22100 });
  });
});

describe("множник кількості 2014", () => {
  it("група 3–5", () => {
    expect([1, 2, 3, 6, 7, 10, 11, 14, 15, 30].map((m) => encounterMultiplier(m, 4))).toEqual([1, 1.5, 2, 2, 2.5, 2.5, 3, 3, 4, 4]);
  });

  it("група < 3 — крок вгору, ≥ 6 — крок вниз", () => {
    expect([1, 2, 15].map((m) => encounterMultiplier(m, 2))).toEqual([1.5, 2, 5]);
    expect([1, 2, 15].map((m) => encounterMultiplier(m, 6))).toEqual([0.5, 1, 3]);
  });
});

describe("computeXpBudget", () => {
  const ogres = { unitId: "ogre", quantity: 2, xp: 450 };

  it("2014: XP × множник, найвищий досягнутий поріг", () => {
    expect(computeXpBudget({ edition: "2014", heroLevels: party(4, 3), enemies: [ogres] })).toEqual({
      edition: "2014", enemyXp: 900, adjustedXp: 1350, multiplier: 1.5, thresholds: { easy: 300, medium: 600, hard: 900, deadly: 1600 }, difficulty: "hard", missingCr: [],
    });
  });

  it("2024: без множника", () => {
    const r = computeXpBudget({ edition: "2024", heroLevels: party(4, 3), enemies: [ogres] });

    expect(r).toMatchObject({ enemyXp: 900, adjustedXp: 900, multiplier: 1, difficulty: "moderate" });
  });

  it("мала група підвищує складність; нижче першого порогу — дрібниця", () => {
    expect(computeXpBudget({ edition: "2014", heroLevels: party(2, 3), enemies: [{ unitId: "ogre", quantity: 1, xp: 450 }] }).difficulty).toBe("hard");
    expect(computeXpBudget({ edition: "2014", heroLevels: party(4, 3), enemies: [{ unitId: "wolf", quantity: 1, xp: 50 }] }).difficulty).toBe("trivial");
  });

  it("юніти без CR — у missingCr, не впливають на XP і множник", () => {
    const r = computeXpBudget({ edition: "2014", heroLevels: party(4, 3), enemies: [{ unitId: "homm", quantity: 5, xp: null }, { unitId: "ogre", quantity: 1, xp: 450 }] });

    expect(r).toMatchObject({ enemyXp: 450, multiplier: 1, adjustedXp: 450, difficulty: "easy", missingCr: ["homm"] });
    expect(computeXpBudget({ edition: "2024", heroLevels: [3], enemies: [{ unitId: "homm", quantity: 1, xp: null }] }).difficulty).toBe("trivial");
  });

  it("складність для редакції", () => {
    expect(isXpDifficultyOf("2014", "deadly")).toBe(true);
    expect(isXpDifficultyOf("2014", "low")).toBe(false);
    expect(isXpDifficultyOf("2024", "moderate")).toBe(true);
    expect(isXpDifficultyOf("2024", undefined)).toBe(false);
  });
});

describe("pickXpRoster", () => {
  const library = [
    { unitId: "wolf", xp: 50, raceId: null },
    { unitId: "ogre", xp: 450, raceId: "giants" },
    { unitId: "homm", raceId: null },
    { unitId: "phoenix", xp: 3900, raceId: null, summon: true },
  ];

  it("2014: точне попадання в поріг (вовки ×6 = 300 × 2 = 600)", () => {
    expect(pickXpRoster({ edition: "2014", heroLevels: party(4, 3), library, difficulty: "medium" })).toEqual({ unitId: "wolf", quantity: 6 });
  });

  it("2024: нічия — менша кількість", () => {
    const lib = [{ unitId: "goblin", xp: 50, raceId: null }, { unitId: "orc", xp: 100, raceId: null }];

    expect(pickXpRoster({ edition: "2024", heroLevels: party(4, 1), library: lib, difficulty: "moderate" })).toEqual({ unitId: "orc", quantity: 3 });
  });

  it("фільтр раси, без героїв — null", () => {
    expect(pickXpRoster({ edition: "2014", heroLevels: party(4, 3), library, difficulty: "medium", raceId: "giants" })).toEqual({ unitId: "ogre", quantity: 1 });
    expect(pickXpRoster({ edition: "2014", heroLevels: [], library, difficulty: "medium" })).toBeNull();
  });
});

describe("setupXpBudget", () => {
  const stats = {
    characterStats: { h1: { dpr: 10, hp: 30, level: 3 }, h2: { dpr: 10, hp: 30, level: 3 }, npc: { dpr: 10, hp: 30, level: 9 } },
    unitStats: {
      ogre: { dpr: 9, hp: 60, kpi: 0.15, name: "Огр", level: 3, raceId: null, xp: 450 },
      gob: { dpr: 3, hp: 7, kpi: 0.4, name: "Гоблін", level: 1, raceId: null },
    },
  };

  it("герої-союзники дають рівні, вороги-юніти — XP; NPC-вороги ігноруються", () => {
    const r = setupXpBudget(
      [
        { id: "h1", type: "character", side: "ally" },
        { id: "h2", type: "character", side: "ally" },
        { id: "npc", type: "character", side: "enemy" },
        { id: "ogre", type: "unit", side: "enemy", quantity: 1 },
        { id: "gob", type: "unit", side: "enemy", quantity: 3 },
      ],
      stats,
      "2014",
    );

    expect(r).toMatchObject({ enemyXp: 450, multiplier: 1.5, adjustedXp: 675, thresholds: { easy: 150, medium: 300, hard: 450, deadly: 800 }, difficulty: "hard", missingCr: ["gob"] });
  });

  it("немає героїв або ворогів — null", () => {
    expect(setupXpBudget([{ id: "ogre", type: "unit", side: "enemy" }], stats, "2014")).toBeNull();
    expect(setupXpBudget([{ id: "h1", type: "character", side: "ally" }], stats, "2014")).toBeNull();
  });
});
