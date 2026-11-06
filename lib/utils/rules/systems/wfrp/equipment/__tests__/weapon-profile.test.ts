import { describe, expect, it } from "vitest";

import { weaponProfile } from "../weapon-profile";

const sword = { type: "weapon", group: "basic", reach: "average", damage: { addSb: true, flat: 4 }, qualities: [{ key: "damaging" }], flaws: [], twoHanded: false, weight: 1, price: 10 };

const bow = { type: "weapon", group: "bow", range: 60, damage: { addSb: false, flat: 3 }, qualities: [], flaws: [{ key: "reload", value: 1 }], twoHanded: true, ammoCapacity: 20, weight: 1, price: 10 };

describe("weaponProfile", () => {
  it("melee: average reach is 1 cell", () => {
    expect(weaponProfile(sword)).toEqual({ range: "melee", cells: 1, damageFlat: 4, addSb: true, qualities: [{ key: "damaging" }], flaws: [], twoHanded: false });
  });

  it("longer reach spans more cells", () => {
    expect(weaponProfile({ ...sword, reach: "very-long" })?.cells).toBe(3);
  });

  it("ranged: 60 ft is 10 cells, keeps ammo and two-handed", () => {
    expect(weaponProfile(bow)).toMatchObject({ range: "ranged", cells: 10, rangeFt: 60, damageFlat: 3, addSb: false, twoHanded: true, ammoCapacity: 20, flaws: [{ key: "reload", value: 1 }] });
  });

  it("null for armour stats and garbage", () => {
    expect(weaponProfile({ type: "gear", weight: 1, price: 1, qualities: [] })).toBeNull();
    expect(weaponProfile(null)).toBeNull();
    expect(weaponProfile({ type: "weapon" })).toBeNull();
    expect(weaponProfile("x")).toBeNull();
  });
});
