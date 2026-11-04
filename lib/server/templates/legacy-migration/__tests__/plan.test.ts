import { describe, expect, it } from "vitest";

import { LEGACY_UNKNOWN_HASH, planLegacyMigration } from "../plan";
import type { PlanInput, Row } from "../types";

import { BUNDLE_TABLES, type BundleTable } from "@/lib/server/templates/bundle";
import { id } from "@/lib/server/templates/sync/__tests__/helpers";
import { rowHash } from "@/lib/server/templates/sync/hash";

const T = (key: BundleTable) => BUNDLE_TABLES.find((t) => t.key === key)!;

const h = (table: BundleTable, row: Row) => rowHash(row, T(table));

const empty = <V>(make: () => V) => Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, make()])) as Record<BundleTable, V>;

interface Setup {
  stored?: Partial<Record<BundleTable, Row[]>>;
  base?: Partial<Record<BundleTable, Row[]>>;
  baseline?: Partial<Record<BundleTable, Record<string, string>>>;
  ignored?: PlanInput["ignored"];
}

const plan = ({ stored = {}, base = {}, baseline = {}, ignored = { tables: {}, rules: {} } }: Setup) =>
  planLegacyMigration({
    campaignId: "camp",
    stored: { ...empty(() => [] as Row[]), ...stored },
    base: { ...empty(() => new Map<string, Row>()), ...Object.fromEntries(Object.entries(base).map(([k, rows]) => [k, new Map(rows!.map((r) => [r.id, r]))])) },
    baseline,
    ignored,
  });

const B = id("b"), L = id("l"), L2 = id("m");

const baseSpell: Row = { id: B, name: "Bless", level: 1 };

const local = (extra: Record<string, unknown> = {}): Row => ({ id: L, campaignId: "camp", sourceId: B, sourceHash: "x", createdAt: new Date(1), name: "Bless", level: 1, ...extra });

const decisionOf = (p: ReturnType<typeof plan>) => p.decisions.map((d) => d.kind === "override" ? `${d.kind}:${d.reason}` : d.kind);

describe("planLegacyMigration decisions", () => {
  it("baseRef: unchanged copy is removed", () => {
    const p = plan({ stored: { spells: [local()] }, base: { spells: [baseSpell] }, baseline: { spells: { [B]: h("spells", baseSpell) } } });

    expect(decisionOf(p)).toEqual(["baseRef"]);
    expect(p.rows.spells).toEqual([]);
    expect(p.idMap.get(L)).toBe(B);
    expect(p.hides).toEqual([]);
  });

  it("override dmEdited keeps local id and sets sourceHash to baseline", () => {
    const p = plan({ stored: { spells: [local({ name: "Mine" })] }, base: { spells: [baseSpell] }, baseline: { spells: { [B]: h("spells", baseSpell) } } });

    expect(decisionOf(p)).toEqual(["override:dmEdited"]);
    expect(p.rows.spells[0]).toMatchObject({ id: L, sourceId: B, sourceHash: h("spells", baseSpell), name: "Mine" });
  });

  it("override templateChanged (DM did not touch, template moved on)", () => {
    const b0 = { ...baseSpell, name: "Old" };

    const p = plan({ stored: { spells: [local({ name: "Old" })] }, base: { spells: [baseSpell] }, baseline: { spells: { [B]: h("spells", b0) } } });

    expect(decisionOf(p)).toEqual(["override:templateChanged"]);
    expect(p.rows.spells[0].sourceHash).toBe(h("spells", b0));
  });

  it("override both", () => {
    const b0 = { ...baseSpell, name: "Old" };

    const p = plan({ stored: { spells: [local({ name: "Mine" })] }, base: { spells: [baseSpell] }, baseline: { spells: { [B]: h("spells", b0) } } });

    expect(decisionOf(p)).toEqual(["override:both"]);
  });

  it("noBaseline: sentinel hash", () => {
    const p = plan({ stored: { spells: [local({ name: "Mine" })] }, base: { spells: [baseSpell] } });

    expect(decisionOf(p)).toEqual(["override:noBaseline"]);
    expect(p.rows.spells[0].sourceHash).toBe(LEGACY_UNKNOWN_HASH);
  });

  it("orphan: source row gone from the base", () => {
    const p = plan({ stored: { spells: [local()] }, baseline: { spells: { [B]: "old" } } });

    expect(decisionOf(p)).toEqual(["override:orphan"]);
    expect(p.rows.spells[0]).toMatchObject({ sourceId: B, sourceHash: "old" });
  });

  it("orphan without baseline uses the sentinel", () => {
    const p = plan({ stored: { spells: [local()] } });

    expect(p.rows.spells[0].sourceHash).toBe(LEGACY_UNKNOWN_HASH);
  });

  it("local row keeps its id and has no source link", () => {
    const own = { id: L, campaignId: "camp", sourceId: null, sourceHash: null, createdAt: new Date(1), name: "Own" };

    const p = plan({ stored: { spells: [own] } });

    expect(decisionOf(p)).toEqual(["local"]);
    expect(p.rows.spells[0]).toMatchObject({ id: L, sourceId: null, name: "Own" });
    expect(p.idMap.size).toBe(0);
  });

  it("hide without pending when the baseline knew the row", () => {
    const p = plan({ base: { spells: [baseSpell] }, baseline: { spells: { [B]: h("spells", baseSpell) } } });

    expect(p.decisions).toEqual([{ kind: "hide", table: "spells", key: B, pending: false }]);
    expect(p.hides).toEqual([{ table: "spells", id: B }]);
    expect(p.ignored.tables.spells ?? {}).toEqual({});
  });

  it("hide + pending marker when the baseline did not know the row", () => {
    const p = plan({ base: { spells: [baseSpell] }, ignored: { tables: { spells: { [B]: "kept" } }, rules: {} } });

    expect(p.decisions).toEqual([{ kind: "hide", table: "spells", key: B, pending: true }]);
    expect(p.ignored.tables.spells).toEqual({ [B]: "kept", [`pending:${B}`]: h("spells", baseSpell) });
  });

  it("legacy ignored keys survive and the input is not mutated", () => {
    const ignored = { tables: { spells: { [B]: "kept" } }, rules: { r: "1" }, settings: "s" };

    const p = plan({ stored: { spells: [local()] }, base: { spells: [baseSpell] }, baseline: { spells: { [B]: h("spells", baseSpell) } }, ignored });

    expect(p.ignored).toEqual(ignored);
    expect(p.ignored).not.toBe(ignored);
  });

  it("hide table is the database table name", () => {
    const p = plan({ base: { skillTrees: [{ id: B, race: "T" }] }, baseline: { skillTrees: { [B]: "x" } } });

    expect(p.hides[0].table).toBe("skill_trees");
  });
});

describe("planLegacyMigration anomalies", () => {
  it("duplicate sourceId: the row equal to base wins, the other becomes local", () => {
    const same = local({ id: L, createdAt: new Date(5) });

    const edited = local({ id: L2, name: "Mine", createdAt: new Date(1) });

    const p = plan({ stored: { spells: [edited, same] }, base: { spells: [baseSpell] }, baseline: { spells: { [B]: h("spells", baseSpell) } } });

    expect(p.idMap.get(L)).toBe(B);
    expect(p.idMap.has(L2)).toBe(false);
    expect(p.decisions).toContainEqual({ kind: "local", table: "spells", localId: L2, demoted: "duplicate" });
    expect(p.rows.spells).toEqual([expect.objectContaining({ id: L2, sourceId: null, sourceHash: null })]);
    expect(p.warnings).toEqual([{ code: "DUPLICATE_SOURCE_ID", table: "spells", id: L2 }]);
    expect(p.hides).toEqual([]);
  });

  it("duplicate sourceId without a base match: the oldest wins", () => {
    const old = local({ id: L, name: "A", createdAt: new Date(1) });

    const young = local({ id: L2, name: "B", createdAt: new Date(9) });

    const p = plan({ stored: { spells: [young, old] }, base: { spells: [baseSpell] }, baseline: { spells: { [B]: "x" } } });

    expect(p.idMap.get(L)).toBe(B);
    expect(p.rows.spells.map((r) => [r.id, r.sourceId])).toEqual([[L2, null], [L, B]]);
  });

  it("non-cuid sourceId makes the row local with a warning", () => {
    const p = plan({ stored: { spells: [local({ sourceId: "not-a-cuid" })] } });

    expect(p.decisions).toEqual([{ kind: "local", table: "spells", localId: L, demoted: "badSourceId" }]);
    expect(p.warnings).toEqual([{ code: "BAD_SOURCE_ID", table: "spells", id: L }]);
    expect(p.rows.spells[0].sourceId).toBeNull();
  });

  it("a retained local row whose id is a base id is a blocker", () => {
    const own = { id: B, campaignId: "camp", sourceId: null, sourceHash: null, createdAt: new Date(1), name: "Own" };

    const p = plan({ stored: { spells: [own] }, base: { spells: [baseSpell] }, baseline: { spells: { [B]: "x" } } });

    expect(p.blockers).toEqual([{ code: "ID_COLLISION", table: "spells", id: B }]);
  });
});

describe("planLegacyMigration remap in content", () => {
  const sp = id("p"), spBase = id("q"), sk = id("k"), skBase = id("r"), tree = id("t"), treeBase = id("u");

  it("rewrites references from kept local rows to base ids and keeps the hash comparison in base space", () => {
    const stored = {
      spells: [local({ id: sp, sourceId: spBase, name: "Fire" })],
      skills: [
        { id: sk, campaignId: "camp", sourceId: skBase, sourceHash: "x", createdAt: new Date(1), name: "S", spellId: sp, abilities: [{ spellId: sp }] },
        { id: id("o"), campaignId: "camp", sourceId: null, sourceHash: null, createdAt: new Date(1), name: "Own skill", spellId: sp, abilities: [{ spellId: sp, n: 1 }] },
      ],
      skillTrees: [{ id: tree, campaignId: "camp", sourceId: treeBase, sourceHash: "x", createdAt: new Date(1), race: "Tree", skills: [{ skillId: sk }] }],
    };

    const base = {
      spells: [{ id: spBase, name: "Fire", level: 1 }],
      skills: [{ id: skBase, name: "S", spellId: spBase, abilities: [{ spellId: spBase }] }],
      skillTrees: [{ id: treeBase, race: "Tree", skills: [{ skillId: skBase }] }],
    };

    const p = plan({ stored, base, baseline: { spells: { [spBase]: "x" }, skills: { [skBase]: "x" }, skillTrees: { [treeBase]: "x" } } });

    expect(p.decisions.filter((d) => d.kind === "baseRef")).toHaveLength(3);
    expect(p.rows.skills).toHaveLength(1);
    expect(p.rows.skills[0]).toMatchObject({ name: "Own skill", spellId: spBase, abilities: [{ spellId: spBase, n: 1 }], sourceId: null });
    expect(p.rows.skills[0].id).toBe(id("o"));
  });

  it("an overridden skill tree is stored with base skill ids", () => {
    const stored = {
      skills: [{ id: sk, campaignId: "camp", sourceId: skBase, sourceHash: "x", createdAt: new Date(1), name: "S" }],
      skillTrees: [{ id: tree, campaignId: "camp", sourceId: treeBase, sourceHash: "x", createdAt: new Date(1), race: "Mine", skills: [{ skillId: sk }] }],
    };

    const base = { skills: [{ id: skBase, name: "S" }], skillTrees: [{ id: treeBase, race: "Tree", skills: [{ skillId: skBase }] }] };

    const p = plan({ stored, base, baseline: { skills: { [skBase]: "x" }, skillTrees: { [treeBase]: "x" } } });

    expect(p.rows.skillTrees[0]).toMatchObject({ id: tree, sourceId: treeBase, race: "Mine", skills: [{ skillId: skBase }] });
  });
});
