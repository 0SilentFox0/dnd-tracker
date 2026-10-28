import { describe, expect, it } from "vitest";

import { armorDexCap, armorStatsColumns, armorStatsFromRow } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns, weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";

describe("armor stats in modifiers", () => {
  it("round-trips heavy armor with strength and stealth", () => {
    const stats = { category: "heavy" as const, base: 16, strength: 13, stealthDisadvantage: true };

    const cols = armorStatsColumns(stats);

    expect(cols.modifiers).toEqual([
      { type: "armorCategory", value: "heavy" },
      { type: "armorBase", value: "16" },
      { type: "armorStrength", value: "13" },
      { type: "armorStealth", value: "true" },
    ]);
    expect(armorStatsFromRow(cols)).toEqual(stats);
  });

  it("keeps an explicit dex cap, drops empty optional fields", () => {
    expect(armorStatsFromRow(armorStatsColumns({ category: "medium", base: 14, dexCap: 3 }))).toEqual({ category: "medium", base: 14, dexCap: 3 });
    expect(armorStatsFromRow(armorStatsColumns({ category: "light", base: 11 }))).toEqual({ category: "light", base: 11 });
  });

  it("no armor records / broken records → null; weapon reader ignores armor records", () => {
    expect(armorStatsFromRow({ modifiers: [] })).toBeNull();
    expect(armorStatsFromRow({ modifiers: [{ type: "armorCategory", value: "heavy" }] })).toBeNull();
    expect(armorStatsFromRow({ modifiers: [{ type: "armorCategory", value: "cloth" }, { type: "armorBase", value: "12" }] })).toBeNull();
    expect(armorStatsFromRow({ modifiers: "x" })).toBeNull();
    expect(weaponStatsFromRow(armorStatsColumns({ category: "heavy", base: 18 }))).toEqual({});
  });

  it("weapon records do not look like armor", () => {
    expect(armorStatsFromRow(weaponStatsColumns({ damageDice: "1d8", damageType: "slashing" }))).toBeNull();
  });

  it("dex cap defaults by category", () => {
    expect(armorDexCap({ category: "light", base: 11 })).toBeNull();
    expect(armorDexCap({ category: "medium", base: 14 })).toBe(2);
    expect(armorDexCap({ category: "heavy", base: 16 })).toBe(0);
    expect(armorDexCap({ category: "medium", base: 14, dexCap: 3 })).toBe(3);
    expect(armorDexCap({ category: "medium", base: 14, dexCap: null })).toBe(2);
  });
});
