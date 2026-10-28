import { describe, expect, it } from "vitest";

import { weaponStatsColumns, weaponStatsFromRow } from "../weapon-stats";

describe("weapon traits", () => {
  it("round-trips traits and versatileDice", () => {
    const stats = { damageDice: "1d8", traits: ["versatile", "finesse"] as ("versatile" | "finesse")[], versatileDice: "1d10" };

    expect(weaponStatsFromRow(weaponStatsColumns(stats))).toEqual({ damageDice: "1d8", traits: ["versatile", "finesse"], versatileDice: "1d10" });
  });

  it("drops unknown traits", () => {
    expect(weaponStatsFromRow({ modifiers: [{ type: "traits", value: "light,flying" }] }).traits).toEqual(["light"]);
  });
});
