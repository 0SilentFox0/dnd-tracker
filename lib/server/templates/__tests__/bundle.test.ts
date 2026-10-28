import { describe, expect, it } from "vitest";

import { BUNDLE_TABLES, BundleSchema } from "../bundle";

const empty = {
  formatVersion: 1,
  settings: { maxLevel: 20, xpMultiplier: 2.5, allowPlayerEdit: true, friendlyFire: false },
  rules: {},
  spellGroups: [],
  races: [],
  classes: [],
  units: [],
  spells: [],
  mainSkills: [],
  skills: [],
  skillTrees: [],
  artifactSets: [],
  artifacts: [],
  tracks: [],
};

describe("BUNDLE_TABLES", () => {
  it("every fk points to a table that is inserted earlier", () => {
    const order = BUNDLE_TABLES.map((t) => t.key);

    for (const t of BUNDLE_TABLES) {
      for (const [col, target] of Object.entries(t.fks)) {
        expect(order.indexOf(target!), `${t.key}.${col}`).toBeLessThan(order.indexOf(t.key));
        expect(t.columns).toContain(col);
      }
    }
  });

  it("excludes bookkeeping columns and detects nullable json", () => {
    for (const t of BUNDLE_TABLES) {
      for (const c of ["campaignId", "createdAt", "updatedAt", "sourceId", "sourceHash"]) expect(t.columns).not.toContain(c);

      expect(t.columns).toContain("id");
    }

    expect(BUNDLE_TABLES.find((t) => t.key === "spells")!.nullableJson).toContain("fx");
    expect(BUNDLE_TABLES.find((t) => t.key === "units")!.nullableJson).toEqual(["levelScaling"]);
  });
});

describe("BundleSchema", () => {
  it("accepts an empty bundle", () => {
    expect(BundleSchema.safeParse(empty).success).toBe(true);
  });

  it("rejects formatVersion 2, non-cuid ids and maxLevel 99", () => {
    expect(BundleSchema.safeParse({ ...empty, formatVersion: 2 }).success).toBe(false);
    expect(BundleSchema.safeParse({ ...empty, units: [{ id: "abc" }] }).success).toBe(false);
    expect(BundleSchema.safeParse({ ...empty, settings: { ...empty.settings, maxLevel: 99 } }).success).toBe(false);
  });

  it("keeps unknown row keys (stripped later by pick)", () => {
    const r = BundleSchema.parse({ ...empty, races: [{ id: "c" + "a".repeat(24), foo: 1 }] });

    expect(r.races[0].foo).toBe(1);
  });
});

describe("derived foreign keys", () => {
  const summonFk = "summon" + "UnitId";

  it("match the content graph exactly", () => {
    const fks = Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, t.fks]));

    expect(fks).toEqual({
      spellGroups: {},
      races: {},
      classes: {},
      units: { raceId: "races" },
      spells: { groupId: "spellGroups", [summonFk]: "units" },
      mainSkills: { spellGroupId: "spellGroups" },
      skills: { spellId: "spells", spellNewSpellId: "spells", grantedSpellId: "spells", spellGroupId: "spellGroups", mainSkillId: "mainSkills" },
      skillTrees: {},
      artifactSets: {},
      artifacts: { setId: "artifactSets" },
      tracks: {},
    });
  });
});

describe("старі бандли без таблиці classes", () => {
  it("імпортуються з порожніми класами", () => {
    const { classes: _classes, ...old } = empty;

    const parsed = BundleSchema.parse(old);

    expect(parsed.classes).toEqual([]);
  });
});
