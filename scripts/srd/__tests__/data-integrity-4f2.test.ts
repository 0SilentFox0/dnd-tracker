import { describe, expect, it } from "vitest";

import { readSrdData, toImportRows } from "../lib/data-files";

import { createClassSchema } from "@/lib/schemas/classes";
import { applyClassScale, classPools, columnRefIssues } from "@/lib/utils/abilities/class-columns";
import { classColumnIssues } from "@/lib/utils/characters/classes/columns";
import type { GameClassData } from "@/types/classes";

const data = readSrdData();

const cls = (name: string) => data.classes.find((c) => c.name === name)!;

const featureLists = (c: (typeof data.classes)[number]) => [...c.features, ...c.subclasses.flatMap((s) => s.features)];

const find = (className: string, name: string) => featureLists(cls(className)).flatMap((f) => f.abilities).find((a) => a.name === name)!;

const ARMOR = {
  "Padded Armor": { category: "light", base: 11, stealthDisadvantage: true },
  "Leather Armor": { category: "light", base: 11 },
  "Studded Leather Armor": { category: "light", base: 12 },
  "Hide Armor": { category: "medium", base: 12 },
  "Chain Shirt": { category: "medium", base: 13 },
  "Scale Mail": { category: "medium", base: 14, stealthDisadvantage: true },
  Breastplate: { category: "medium", base: 14 },
  "Half Plate Armor": { category: "medium", base: 15, stealthDisadvantage: true },
  "Ring Mail": { category: "heavy", base: 14, stealthDisadvantage: true },
  "Chain Mail": { category: "heavy", base: 16, strength: 13, stealthDisadvantage: true },
  "Splint Armor": { category: "heavy", base: 17, strength: 15, stealthDisadvantage: true },
  "Plate Armor": { category: "heavy", base: 18, strength: 15, stealthDisadvantage: true },
};

describe("SRD 5.2 data: 4f-2", () => {
  it("12 armors match the SRD table", () => {
    expect(Object.fromEntries(data.artifacts.filter((a) => a.slot === "armor").map((a) => [a.name, a.armor]))).toEqual(ARMOR);
  });

  it("class tables: ≤ 12 columns, 20 cells, unique keys, numeric pools", () => {
    for (const c of data.classes) {
      expect(c.columns.length, c.name).toBeLessThanOrEqual(12);
      expect(c.columns.every((col) => col.values.length === 20), c.name).toBe(true);
      expect(classColumnIssues(c.columns), c.name).toEqual([]);
    }
  });

  it("every scale/pool ref resolves to the class table; rows pass the class schema", () => {
    for (const c of data.classes) {
      expect(featureLists(c).flatMap((f) => columnRefIssues(f.abilities, c.columns)), c.name).toEqual([]);
      expect(createClassSchema.safeParse(toImportRows([c])[0]).success, c.name).toBe(true);
    }
  });

  it("Rage 1/9/17, Sneak Attack 5, Monk Focus 5", () => {
    const barb = cls("Barbarian");

    expect([1, 9, 17].map((level) => applyClassScale([find("Barbarian", "Rage")], { classId: barb.slug, level, columns: barb.columns })[0].limits?.perRest?.uses)).toEqual([2, 4, 6]);

    const rogue = cls("Rogue");

    expect(applyClassScale([find("Rogue", "Sneak Attack")], { classId: rogue.slug, level: 5, columns: rogue.columns })[0].effects[0]).toMatchObject({ amount: "3d6" });

    const monk = { ...cls("Monk"), id: "monk" } as unknown as GameClassData;

    expect(classPools([{ classId: "monk", level: 5, class: monk, subclass: null }])["pool:monk:focus-points"]).toEqual({ label: "Focus Points", max: 5, rest: "short" });
  });

  it("Empowered Evocation points at an existing school name", () => {
    expect(JSON.stringify(find("Wizard", "Empowered Evocation"))).toContain('"school":"Evocation"');
    expect(data["spell-groups"].map((g) => g.name)).toContain("Evocation");
  });
});
