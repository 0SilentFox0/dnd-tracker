import { describe, expect, it } from "vitest";

import { classColumnIssues, classTableText, columnValueAt, parseColumnValue, parseColumnValuesText } from "@/lib/utils/characters/classes/columns";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import type { ClassColumn } from "@/types/classes";

const levels = (f: (l: number) => string) => Array.from({ length: 20 }, (_, i) => f(i + 1));

const rages: ClassColumn = { key: "rages", label: "Rages", values: levels((l) => (l >= 17 ? "6" : l >= 9 ? "4" : "2")) };

describe("parseColumnValue", () => {
  it("numbers with sign and unit, dice, empty", () => {
    expect(parseColumnValue("2")).toBe(2);
    expect(parseColumnValue("+3")).toBe(3);
    expect(parseColumnValue("+10 ft.")).toBe(10);
    expect(parseColumnValue("-1")).toBe(-1);
    expect(parseColumnValue("D8")).toBe("1d8");
    expect(parseColumnValue("d12")).toBe("1d12");
    expect(parseColumnValue("3d6")).toBe("3d6");
    expect(parseColumnValue("1D10")).toBe("1d10");
    expect(parseColumnValue("")).toBeNull();
    expect(parseColumnValue("  ")).toBeNull();
    expect(parseColumnValue("—")).toBeNull();
    expect(parseColumnValue(undefined)).toBeNull();
  });

  it("columnValueAt clamps the level to 1..20", () => {
    expect(columnValueAt(rages, 1)).toBe(2);
    expect(columnValueAt(rages, 9)).toBe(4);
    expect(columnValueAt(rages, 25)).toBe(6);
    expect(columnValueAt(rages, 0)).toBe(2);
  });
});

describe("classColumnIssues", () => {
  it("duplicate keys and non-numeric pool cells", () => {
    const focus: ClassColumn = { key: "focus-points", label: "Focus Points", values: levels((l) => (l === 1 ? "" : String(l))), pool: { rest: "short" } };

    expect(classColumnIssues([rages, focus])).toEqual([]);
    expect(classColumnIssues([rages, { ...rages }])).toEqual([{ path: [1, "key"], message: "classes.validation.columnKeyRepeated", params: { key: "rages" } }]);
    expect(classColumnIssues([{ ...focus, values: levels(() => "D6") }])[0]).toEqual({ path: [0, "values", 0], message: "classes.validation.poolNotNumber", params: { label: "Focus Points", level: 1 } });
  });
});

describe("text helpers", () => {
  it("parseColumnValuesText pads and trims to 20 cells", () => {
    expect(parseColumnValuesText("2, 2, 3")).toEqual(["2", "2", "3", ...Array(17).fill("")]);
    expect(parseColumnValuesText(Array(25).fill("1").join(","))).toHaveLength(20);
  });

  it("classTableText shows non-empty cells at the level", () => {
    const damage: ClassColumn = { key: "rage-damage", label: "Rage Damage", values: levels((l) => (l >= 9 ? "+3" : "+2")) };

    const empty: ClassColumn = { key: "x", label: "X", values: levels(() => "") };

    expect(classTableText({ name: "Barbarian", level: 5, columns: [rages, damage, empty] })).toBe("Barbarian 5 · Rages 2 · Rage Damage +2");
    expect(classTableText({ name: "Fighter", level: 3, columns: [] })).toBe("Fighter 3");
  });
});

describe("toGameClassData columns", () => {
  it("keeps valid columns, drops broken ones, defaults to []", () => {
    const row = { id: "b", campaignId: "c", name: "Barbarian", icon: null, color: null, hitDie: 12, savingThrows: [], proficiencies: {}, skillChoices: {}, caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [], createdAt: new Date(0), updatedAt: new Date(0), sourceId: null, sourceHash: null };

    expect(toGameClassData({ ...row, columns: [rages, { key: "Bad Key", label: "x", values: [] }] } as never).columns).toEqual([rages]);
    expect(toGameClassData({ ...row, columns: null } as never).columns).toEqual([]);
  });
});
