import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { type Bundle, BUNDLE_TABLES, BundleInvalidError, TemplateLeakError } from "../bundle";
import { exportCampaign } from "../export-campaign";
import { importBundle } from "../import-bundle";
import { collectKeysAndStrings } from "../remap-ids";
import { createFakeDb } from "./fake-db";

const id = (c: string) => "c" + c.repeat(24);

const G = id("a"), R = id("b"), U = id("c"), SP = id("d"), M = id("e"), SK = id("f"), T = id("g"), AS = id("h"), AR = id("i"), TR = id("j");

const settings = { maxLevel: 20, xpMultiplier: 2.5, allowPlayerEdit: true, friendlyFire: false };

function fullBundle(): Bundle {
  return {
    formatVersion: 1,
    settings,
    rules: {},
    spellGroups: [{ id: G, name: "g" }],
    races: [{ id: R, name: "Human" }],
    units: [{ id: U, name: "u", raceId: R, abilities: [], levelScaling: null }],
    spells: [{ id: SP, name: "s", groupId: G, summonUnitId: U, fx: null, spellEffects: [{ summon: { unitId: U } }] }],
    mainSkills: [{ id: M, name: "m", spellGroupId: G }],
    skills: [
      {
        id: SK,
        name: "k",
        spellId: SP,
        mainSkillId: M,
        abilities: [{ castSpellOnHit: { spellId: SP }, trigger: { spellIds: [SP] } }],
      },
    ],
    skillTrees: [{ id: T, race: "Human", skills: [{ levelSkillIds: { 1: SK } }] }],
    artifactSets: [{ id: AS, name: "set", setBonus: null }],
    artifacts: [{ id: AR, name: "a", setId: AS, abilities: [{ spellId: SP }] }],
    tracks: [{ id: TR, title: "t", kind: "youtube", url: null, youtubeId: "x", durationSec: null, sortOrder: 0 }],
  } as unknown as Bundle;
}

const rowsOf = (store: Map<string, Record<string, unknown>[]>, delegate: string) => store.get(delegate)!;

describe("importBundle", () => {
  it("remaps ids, references and records provenance", async () => {
    const { db, store } = createFakeDb();

    const { idMap, warnings } = await importBundle(db, fullBundle(), "target");

    expect(warnings).toEqual([]);

    for (const t of BUNDLE_TABLES) {
      const [row] = rowsOf(store, t.delegate);

      expect(row.campaignId).toBe("target");
      expect(idMap.get(row.sourceId as string)).toBe(row.id);
      expect(row.sourceId).not.toBe(row.id);
      expect(row.sourceHash).toMatch(/^[0-9a-f]{40}$/);
    }

    const n = (old: string) => idMap.get(old)!;

    const [unit] = rowsOf(store, "unit");

    const [spell] = rowsOf(store, "spell");

    const [skill] = rowsOf(store, "skill");

    const [tree] = rowsOf(store, "skillTree");

    const [artifact] = rowsOf(store, "artifact");

    expect(unit.raceId).toBe(n(R));
    expect(spell).toMatchObject({ groupId: n(G), summonUnitId: n(U), spellEffects: [{ summon: { unitId: n(U) } }] });
    expect(rowsOf(store, "mainSkill")[0].spellGroupId).toBe(n(G));
    expect(skill).toMatchObject({
      spellId: n(SP),
      mainSkillId: n(M),
      abilities: [{ castSpellOnHit: { spellId: n(SP) }, trigger: { spellIds: [n(SP)] } }],
    });
    expect(tree.race).toBe("Human");
    expect(tree.skills).toEqual([{ levelSkillIds: { 1: n(SK) } }]);
    expect(artifact).toMatchObject({ setId: n(AS), abilities: [{ spellId: n(SP) }] });

    const all = new Set<string>();

    for (const t of BUNDLE_TABLES) for (const r of rowsOf(store, t.delegate)) collectKeysAndStrings({ ...r, sourceId: null }, all);

    for (const old of idMap.keys()) expect(all.has(old)).toBe(false);
  });

  it("sends Prisma.DbNull for null in nullable json columns", async () => {
    const created: Array<Record<string, unknown>> = [];

    const { db } = createFakeDb();

    (db as unknown as { unit: { createMany: (a: { data: Array<Record<string, unknown>> }) => Promise<void> } }).unit.createMany = async ({ data }) => {
      created.push(...data);
    };

    await importBundle(db, fullBundle(), "target");

    expect(created[0].levelScaling).toBe(Prisma.DbNull);
  });

  it("nulls an fk whose target is not in the bundle and warns", async () => {
    const foreign = id("z");

    const bundle = fullBundle();

    bundle.units[0].raceId = foreign;

    const { db, store } = createFakeDb();

    const { warnings } = await importBundle(db, bundle, "target");

    expect(rowsOf(store, "unit")[0].raceId).toBeNull();
    expect(warnings).toEqual([`units ${U}: raceId → null`]);
  });

  it("drops extra keys and forces campaignId", async () => {
    const bundle = fullBundle();

    Object.assign(bundle.races[0], { campaignId: "evil", foo: 1 });

    const { db, store } = createFakeDb();

    await importBundle(db, bundle, "target");

    const [race] = rowsOf(store, "race");

    expect(race.campaignId).toBe("target");
    expect(race).not.toHaveProperty("foo");
  });

  it("rejects json references to content of other campaigns", async () => {
    const foreignUnit = id("y");

    const bundle = fullBundle();

    (bundle.spells[0].spellEffects as Array<{ summon: { unitId: string } }>)[0].summon.unitId = foreignUnit;

    const { db, store } = createFakeDb();

    store.get("unit")!.push({ id: foreignUnit, campaignId: "other" });

    await expect(importBundle(db, bundle, "target")).rejects.toBeInstanceOf(BundleInvalidError);
    expect(rowsOf(store, "spell")).toHaveLength(0);
  });

  it("rejects a source id left in a json key before writing", async () => {
    const bundle = fullBundle();

    bundle.skillTrees[0].skills = { [SK]: 1 };

    const { db, store } = createFakeDb();

    await expect(importBundle(db, bundle, "target")).rejects.toBeInstanceOf(TemplateLeakError);

    for (const t of BUNDLE_TABLES) expect(rowsOf(store, t.delegate)).toHaveLength(0);
  });

  it("rejects duplicate ids within one table before writing", async () => {
    const bundle = fullBundle();

    bundle.races.push({ id: R, name: "Dup" } as Bundle["races"][number]);

    const { db, store } = createFakeDb();

    await expect(importBundle(db, bundle, "target")).rejects.toBeInstanceOf(BundleInvalidError);

    for (const t of BUNDLE_TABLES) expect(rowsOf(store, t.delegate)).toHaveLength(0);
  });

  it("imports an empty bundle", async () => {
    const bundle = Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, []]));

    const { db } = createFakeDb();

    const res = await importBundle(db, { formatVersion: 1, settings, rules: {}, ...bundle } as unknown as Bundle, "target");

    expect(res.idMap.size).toBe(0);
    expect(res.warnings).toEqual([]);
  });

  it("import -> export round-trips after inverse id mapping", async () => {
    const src = fullBundle();

    const { db } = createFakeDb();

    const { idMap } = await importBundle(db, src, "target");

    const exported = await exportCampaign(db, "target");

    const inverse = new Map([...idMap].map(([o, nw]) => [nw, o]));

    const back = JSON.parse(JSON.stringify(exported), (_k, v) => (typeof v === "string" ? (inverse.get(v) ?? v) : v));

    for (const t of BUNDLE_TABLES) expect(back[t.key]).toEqual(src[t.key]);

    expect(back.settings).toEqual(settings);
  });
});
