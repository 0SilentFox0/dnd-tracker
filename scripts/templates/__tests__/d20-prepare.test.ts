import { describe, expect, it } from "vitest";

import { iconColumnOf, withIcons } from "../lib/icons-file";
import type { IconsFile, PackRow } from "../lib/pack";
import { clearableColumnsOf, CORE_CLEARABLE_COLUMNS, staleColumns } from "../lib/row-columns";
import { PACK_HOOKS, SYSTEM_MODULE } from "../systems";
import { D20_MODULE_HOOKS } from "../systems/d20";
import { resolveSchoolRefs, withClassIcons } from "../systems/d20/prepare";

describe("resolveSchoolRefs", () => {
  it("replaces school names with group ids anywhere in a row, leaves unknown names", () => {
    const rows = [{ name: "Wizard", subclasses: [{ features: [{ abilities: [{ effects: [{ kind: "damageBonus", filter: { kind: "magic", school: "Evocation" } }, { kind: "flag", flag: "spellAbsorb", school: "Necromancy", percent: 50 }] }] }] }] }];

    const out = resolveSchoolRefs(rows, new Map([["Evocation", "g-evo"]]));

    expect(JSON.stringify(out)).toContain('"school":"g-evo"');
    expect(JSON.stringify(out)).toContain('"school":"Necromancy"');
    expect(JSON.stringify(rows)).toContain('"school":"Evocation"');
  });
});

describe("staleColumns (d20 spell columns)", () => {
  it("lists, per optional column, the spells that no longer carry it", () => {
    const spells = [
      { slug: "a", name: "Fireball", dieSides: 6, upcastDice: 1 },
      { slug: "b", name: "Freedom of Movement" },
    ] as PackRow[];

    expect(staleColumns(spells, clearableColumnsOf("spells"))).toEqual([
      { column: "dieSides", slugs: ["b"] },
      { column: "upcastDice", slugs: ["b"] },
      { column: "upcastTargets", slugs: ["a", "b"] },
      { column: "addAbilityMod", slugs: ["a", "b"] },
      { column: "fixedDice", slugs: ["a", "b"] },
      { column: "damageBonus", slugs: ["a", "b"] },
    ]);
  });
});

describe("clearableColumnsOf", () => {
  it("core spell columns apply to every pack, including wfrp", () => {
    const spells = [{ slug: "a", name: "Bolt" }] as PackRow[];

    expect(staleColumns(spells, clearableColumnsOf("spells")).map((c) => c.column)).toContain("upcastDice");
    expect(clearableColumnsOf("spells")).toEqual(CORE_CLEARABLE_COLUMNS.spells);
    expect(clearableColumnsOf("units")).toEqual([]);
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

const prepareRows = D20_MODULE_HOOKS.prepareRows as NonNullable<typeof D20_MODULE_HOOKS.prepareRows>;

const normalize = D20_MODULE_HOOKS.normalizeTranslation as NonNullable<typeof D20_MODULE_HOOKS.normalizeTranslation>;

describe("D20_MODULE_HOOKS.prepareRows", () => {
  const pack = (kinds: string[]) => ({ manifest: { kinds } }) as never;

  const row = { slug: "x", name: "X", damageBonus: { school: "Evocation" } } as unknown as PackRow;

  it("class icons first, then school names resolve to group ids when the pack has spell-groups", async () => {
    const idByName = async () => new Map([["Evocation", "g-evo"]]);

    const [out] = await prepareRows("spells", [row], { pack: pack(["spells", "spell-groups"]), icons: {}, idByName });

    expect(JSON.stringify(out)).toContain('"school":"g-evo"');

    const [same] = await prepareRows("spells", [row], { pack: pack(["spells"]), icons: {}, idByName });

    expect(same).toBe(row);
  });

  it("does not resolve inside spell-groups itself", async () => {
    const idByName = async () => { throw new Error("must not be called"); };

    await expect(prepareRows("spell-groups", [row], { pack: pack(["spell-groups"]), icons: {}, idByName })).resolves.toEqual([row]);
  });
});

describe("pack hooks composition", () => {
  it("homm = d20 + homm, dnd5e = d20, wfrp stays d20-free", () => {
    expect(PACK_HOOKS.dnd5e).toBe(D20_MODULE_HOOKS);
    expect(PACK_HOOKS.homm.prepareRows).toBe(D20_MODULE_HOOKS.prepareRows);
    expect(PACK_HOOKS.homm.validatePack).toBeDefined();
    expect(PACK_HOOKS.wfrp.prepareRows).toBeUndefined();
  });

  it("SYSTEM_MODULE follows the system meta", () => {
    expect(SYSTEM_MODULE).toEqual({ homm: "d20", dnd5e: "d20", wfrp: "wfrp" });
  });

  it("d20 normalizeTranslation rebuilds a spell header from the glossary", () => {
    const en = "Level 1 Evocation · Casting Time: 1 action · Range: 30 feet · Components: V, S · Duration: Instantaneous · Classes: Wizard";

    const out = normalize({ key: "k", kind: "spells", slug: "s", fieldPath: "description", cls: "d", en }, "x", { Level: "Рівень" });

    expect(out).toBe("x");
  });
});
