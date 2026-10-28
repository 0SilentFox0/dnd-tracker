import { describe, expect, it } from "vitest";

import { weaponStatsColumns, weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";
import { isPropertyRow, isUniqueRow, itemStatsFromRow, itemStatsRecords } from "@/lib/utils/items/item-row";
import { itemStatsColumns, ItemStatsSchema } from "@/lib/utils/items/item-stats";

const FLAME_TONGUE = { unique: false, property: { appliesTo: { kinds: ["weapon" as const], bases: ["Longsword"] }, nameTemplate: "Flame Tongue {base}" }, attunement: true };

describe("item stats in modifiers", () => {
  it("round-trips a property and a charged wand", () => {
    expect(itemStatsFromRow(itemStatsColumns(FLAME_TONGUE))).toEqual(FLAME_TONGUE);

    const wand = { unique: false, attunement: false, charges: { max: 7, rest: "long" as const } };

    expect(itemStatsFromRow(itemStatsColumns(wand))).toEqual(wand);
    expect(itemStatsFromRow(itemStatsColumns({ charges: { max: 3, rest: null } }))).toEqual({ charges: { max: 3, rest: null } });
  });

  it("empty model writes nothing; broken JSON or invalid fields → null", () => {
    expect(itemStatsRecords({})).toEqual([]);
    expect(itemStatsColumns({}).modifiers).toEqual([]);
    expect(itemStatsFromRow({ modifiers: [] })).toBeNull();
    expect(itemStatsFromRow({ modifiers: [{ type: "itemStats", value: "{oops" }] })).toBeNull();
    expect(itemStatsFromRow({ modifiers: [{ type: "itemStats", value: JSON.stringify({ charges: { max: 0, rest: "long" } }) }] })).toBeNull();
    expect(itemStatsFromRow({ modifiers: [{ type: "itemStats", value: JSON.stringify({ property: { appliesTo: { kinds: [] } } }) }] })).toBeNull();
    expect(itemStatsFromRow({ modifiers: "x" })).toBeNull();
  });

  it("weapon reader ignores the item record; damageBonus round-trips", () => {
    const cols = weaponStatsColumns({ damageDice: "1d8", damageBonus: 2 });

    expect(cols.modifiers).toContainEqual({ type: "damageBonus", value: "2" });
    expect(weaponStatsFromRow({ modifiers: [...cols.modifiers, ...itemStatsColumns(FLAME_TONGUE).modifiers] })).toEqual({ damageDice: "1d8", damageBonus: 2 });
  });

  it("uniqueness: HOMM row (no item) is unique, gear and properties are not", () => {
    expect(isUniqueRow({ modifiers: [] })).toBe(true);
    expect(isUniqueRow(itemStatsColumns({ unique: false }))).toBe(false);
    expect(isUniqueRow(itemStatsColumns({ property: FLAME_TONGUE.property }))).toBe(false);
    expect(isPropertyRow(itemStatsColumns(FLAME_TONGUE))).toBe(true);
    expect(isPropertyRow({ modifiers: [] })).toBe(false);
  });

  it("schema: limits, template needs {base}, consumable conflicts", () => {
    expect(ItemStatsSchema.safeParse({ charges: { max: 51, rest: "long" } }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue" } }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ property: { appliesTo: { kinds: ["weapon"], bases: Array.from({ length: 61 }, (_, i) => `b${i}`) } } }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ consumable: true, charges: { max: 2, rest: "long" } }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ consumable: true, property: FLAME_TONGUE.property }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ consumable: true, charges: { max: 2, rest: null } }).success).toBe(true);
  });
});
