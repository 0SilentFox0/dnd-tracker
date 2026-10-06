import { describe, expect, it } from "vitest";

import { isWeaponSlot, weaponStatsColumns, weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";

describe("weapon stats", () => {
  it("пишеться в колонки, які читає бій, і читається назад", () => {
    const stats = { damageDice: "2d8", damageType: "fire", attackType: "melee" as const, range: "5 ft", attackBonus: 2, maxTargets: 2 };

    const cols = weaponStatsColumns(stats);

    expect(cols.bonuses).toEqual({ attackBonus: 2 });
    expect(cols.modifiers).toEqual(
      expect.arrayContaining([
        { type: "damageDice", value: "2d8" },
        { type: "damageType", value: "fire" },
        { type: "attackType", value: "melee" },
        { type: "range", value: "5 ft" },
        { type: "maxTargets", value: "2" },
      ]),
    );
    expect(weaponStatsFromRow(cols)).toEqual(stats);
  });

  it("старі рядки з іншими модифікаторами читаються без них", () => {
    expect(weaponStatsFromRow({ bonuses: { attack: 1, strength: 2 }, modifiers: [{ type: "damageDice", value: "1d8" }, { type: "fire_damage", value: 10 }] })).toEqual({ damageDice: "1d8", attackBonus: 1 });
  });

  it("isWeaponSlot", () => {
    expect(isWeaponSlot("weapon")).toBe(true);
    expect(isWeaponSlot("range_weapon")).toBe(true);
    expect(isWeaponSlot("ring")).toBe(false);
  });
});
