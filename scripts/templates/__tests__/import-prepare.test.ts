import { describe, expect, it } from "vitest";

import { withIcons } from "../lib/icons-file";
import { iconColumnOf, resolveSchoolRefs, staleSpellColumns, withClassIcons } from "../lib/import-prepare";
import type { IconsFile, PackRow } from "../lib/pack";

describe("resolveSchoolRefs", () => {
  it("replaces school names with group ids anywhere in a row, leaves unknown names", () => {
    const rows = [{ name: "Wizard", subclasses: [{ features: [{ abilities: [{ effects: [{ kind: "damageBonus", filter: { kind: "magic", school: "Evocation" } }, { kind: "flag", flag: "spellAbsorb", school: "Necromancy", percent: 50 }] }] }] }] }];

    const out = resolveSchoolRefs(rows, new Map([["Evocation", "g-evo"]]));

    expect(JSON.stringify(out)).toContain('"school":"g-evo"');
    expect(JSON.stringify(out)).toContain('"school":"Necromancy"');
    expect(JSON.stringify(rows)).toContain('"school":"Evocation"');
  });
});

describe("staleSpellColumns", () => {
  it("lists, per optional column, the spells that no longer carry it", () => {
    const spells = [
      { slug: "a", name: "Fireball", dieSides: 6, upcastDice: 1 },
      { slug: "b", name: "Freedom of Movement" },
    ] as PackRow[];

    expect(staleSpellColumns(spells)).toEqual([
      { column: "dieSides", names: ["Freedom of Movement"] },
      { column: "upcastDice", names: ["Freedom of Movement"] },
      { column: "upcastTargets", names: ["Fireball", "Freedom of Movement"] },
      { column: "addAbilityMod", names: ["Fireball", "Freedom of Movement"] },
      { column: "fixedDice", names: ["Fireball", "Freedom of Movement"] },
      { column: "damageBonus", names: ["Fireball", "Freedom of Movement"] },
    ]);
  });
});

const icons: IconsFile = {
  features: { "c1/rage-1": "https://x/f1.webp", "c1/sc/sf-3": "https://x/f2.webp" },
  classes: { c1: "https://x/c1.webp" },
  subclasses: { "c1/sc": "https://x/sc.webp" },
  units: { u1: "https://x/u1.webp" },
  spells: { s1: "https://x/s1.webp" },
};

describe("withIcons by slug", () => {
  it("units get avatar, other kinds get icon, rows without an entry stay untouched, an explicit value wins", () => {
    expect(iconColumnOf("units")).toBe("avatar");
    expect(iconColumnOf("spells")).toBe("icon");
    expect(withIcons([{ slug: "u1", name: "U1" }, { slug: "u2", name: "U2" }], icons.units, iconColumnOf("units"))).toEqual([{ slug: "u1", name: "U1", avatar: "https://x/u1.webp" }, { slug: "u2", name: "U2" }]);
    expect(withIcons([{ slug: "s1", name: "S1", icon: "kept" }], icons.spells)).toEqual([{ slug: "s1", name: "S1", icon: "kept" }]);
  });
});

describe("withClassIcons", () => {
  const row = (): PackRow => ({
    slug: "c1",
    name: "C",
    features: [{ level: 1, abilities: [{ id: "rage-1", name: "Rage" }] }],
    subclasses: [{ id: "sc", name: "SC", features: [{ level: 3, abilities: [{ id: "sf-3" }, { id: "c1-subclass-3" }] }] }],
  });

  it("sets icons on features, subclass features and subclasses, leaves placeholders", () => {
    const input = [row()];

    const snapshot = structuredClone(input);

    const [out] = withClassIcons(input, icons) as unknown as Array<{ features: Array<{ abilities: unknown[] }>; subclasses: Array<{ icon?: string; features: Array<{ abilities: unknown[] }> }> }>;

    expect(out.features[0].abilities[0]).toEqual({ id: "rage-1", name: "Rage", icon: "https://x/f1.webp" });
    expect(out.subclasses[0]).toMatchObject({ icon: "https://x/sc.webp" });
    expect(out.subclasses[0].features[0].abilities).toEqual([{ id: "sf-3", icon: "https://x/f2.webp" }, { id: "c1-subclass-3" }]);
    expect(input).toEqual(snapshot);
  });

  it("is a no-op without feature or subclass icons", () => {
    expect(withClassIcons([row()], {})).toEqual([{ ...row(), features: [{ level: 1, abilities: [{ id: "rage-1", name: "Rage" }] }] }]);
  });
});
