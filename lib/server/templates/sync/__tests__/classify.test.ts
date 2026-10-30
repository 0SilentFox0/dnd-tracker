import { describe, expect, it } from "vitest";

import { id, visible as visibleItems } from "./helpers";

import { type Bundle, BUNDLE_TABLES, emptyBundle } from "@/lib/server/templates/bundle";
import { classify } from "@/lib/server/templates/sync/classify";
import { baselineFromBundle, rowHash } from "@/lib/server/templates/sync/hash";
import type { LocalRow, SyncContext } from "@/lib/server/templates/sync/types";

const spells = BUNDLE_TABLES.find((t) => t.key === "spells")!;

// джерело: S1 Fireball; клон: L1 (sourceId S1)
const S1 = id("a"), S2 = id("b"), L1 = id("x"), L2 = id("y"), U1 = id("u"), LU = id("v");

function ctx(source: Partial<Bundle>, local: LocalRow[], baselineRows: Partial<Bundle>, ignored: SyncContext["ignored"] = { tables: {}, rules: {} }): SyncContext {
  const sourceBundle = { ...emptyBundle(), ...source } as Bundle;

  const base = { ...emptyBundle(), ...baselineRows } as Bundle;

  const tables = Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, Object.fromEntries(base[t.key].map((r) => [r.id, rowHash(r, t)]))]));

  return {
    campaignId: "camp",
    source: { id: "src", name: "HOMM5", kind: "template" },
    sourceBundle,
    target: { settings: emptyBundle().settings, rules: {}, rows: local },
    baseline: baselineFromBundle(base, tables),
    ignored,
    syncedAt: null,
  };
}

const spell = (sid: string, name: string, extra: Record<string, unknown> = {}) => ({ id: sid, name, ...extra });

const local = (lid: string, sid: string | null, name: string, extra: Record<string, unknown> = {}): LocalRow => ({ table: "spells", row: { id: lid, sourceId: sid, name, ...extra } });

const visible = (c: SyncContext) => visibleItems(classify(c));

describe("classify", () => {
  it("fresh clone has no visible changes", () => {
    expect(visible(ctx({ spells: [spell(S1, "Fireball")] }, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }))).toEqual([]);
  });

  it("source changed, local untouched → updated with changed fields", () => {
    const [item] = visible(ctx({ spells: [spell(S1, "Fireball II")] }, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }));

    expect(item).toMatchObject({ scope: "spells", key: S1, localId: L1, status: "updated", changedFields: ["name"], sourceHash: rowHash(spell(S1, "Fireball II"), spells) });
  });

  it("both changed → conflict", () => {
    expect(visible(ctx({ spells: [spell(S1, "A")] }, [local(L1, S1, "B")], { spells: [spell(S1, "Fireball")] }))[0].status).toBe("conflict");
  });

  it("local already equals the new source version (L = S ≠ B) → nothing", () => {
    expect(visible(ctx({ spells: [spell(S1, "Fireball II")] }, [local(L1, S1, "Fireball II")], { spells: [spell(S1, "Fireball")] }))).toEqual([]);
  });

  it("only local changed → nothing visible", () => {
    expect(visible(ctx({ spells: [spell(S1, "Fireball")] }, [local(L1, S1, "Mine")], { spells: [spell(S1, "Fireball")] }))).toEqual([]);
  });

  it("new in source", () => {
    expect(visible(ctx({ spells: [spell(S2, "Ice")] }, [], {}))[0]).toMatchObject({ key: S2, status: "new", localId: null });
  });

  it("deleted in source", () => {
    expect(visible(ctx({}, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }))[0]).toMatchObject({ status: "deletedInSource", localId: L1, sourceHash: null });
  });

  it("deleted locally is visible only when the source changed since baseline", () => {
    const same = classify(ctx({ spells: [spell(S1, "Fireball")] }, [], { spells: [spell(S1, "Fireball")] }));

    expect(same).toEqual([expect.objectContaining({ status: "deletedLocally", visible: false })]);
    expect(visible(ctx({ spells: [spell(S1, "Fireball II")] }, [], { spells: [spell(S1, "Fireball")] }))[0].status).toBe("deletedLocally");
  });

  it("local hash is computed in source id space (fk and json refs)", () => {
    const src = { units: [{ id: U1, name: "Imp" }], spells: [spell(S1, "Summon", { summonUnitId: U1, spellEffects: [{ unitId: U1 }] })] };

    const rows: LocalRow[] = [
      { table: "units", row: { id: LU, sourceId: U1, name: "Imp" } },
      local(L1, S1, "Summon", { summonUnitId: LU, spellEffects: [{ unitId: LU }] }),
    ];

    expect(visible(ctx(src, rows, src))).toEqual([]);
  });

  it("ref to a DM-own row counts as a local change", () => {
    const own = id("o");

    const src = { spells: [spell(S1, "Summon", { summonUnitId: null })] };

    const rows: LocalRow[] = [{ table: "units", row: { id: own, sourceId: null, name: "Mine" } }, local(L1, S1, "Summon", { summonUnitId: own })];

    const changedSrc = { spells: [spell(S1, "Summon II", { summonUnitId: null })] };

    expect(visible(ctx(changedSrc, rows, src))[0].status).toBe("conflict");
  });

  it("requires lists source ids without a local pair", () => {
    const src = { units: [{ id: U1, name: "Imp" }], spells: [spell(S2, "Summon", { summonUnitId: U1 })] };

    const item = visible(ctx(src, [], {})).find((i) => i.key === S2)!;

    expect(item.requires).toEqual([{ scope: "units", key: U1, name: "Imp" }]);
  });

  it("ignored hides the item until the source changes again", () => {
    const changed = spell(S1, "Fireball II");

    const ign = { tables: { spells: { [S1]: rowHash(changed, spells) } }, rules: {} };

    expect(visible(ctx({ spells: [changed] }, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }, ign))).toEqual([]);
    expect(visible(ctx({ spells: [spell(S1, "III")] }, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }, ign))).toHaveLength(1);
  });

  it("ignored deletion uses the 'deleted' marker", () => {
    const ign = { tables: { spells: { [S1]: "deleted" } }, rules: {} };

    expect(visible(ctx({}, [local(L1, S1, "Fireball")], { spells: [spell(S1, "Fireball")] }, ign))).toEqual([]);
  });

  it("rules: per mechanic statuses", () => {
    const c = ctx({ rules: { morale: { enabled: false } } }, [], {});

    const items = visible(c);

    expect(items).toEqual([expect.objectContaining({ scope: "rules", key: "morale", status: "updated", name: "morale" })]);
  });

  it("settings: one item with changed field names", () => {
    const c = ctx({ settings: { ...emptyBundle().settings, maxLevel: 10 } }, [], {});

    expect(visible(c)).toEqual([expect.objectContaining({ scope: "settings", key: "settings", status: "updated", changedFields: ["maxLevel"] })]);
  });

  it("no baseline entry and local equals source → nothing; differs → conflict", () => {
    expect(visible(ctx({ spells: [spell(S1, "F")] }, [local(L1, S1, "F")], {}))).toEqual([]);
    expect(visible(ctx({ spells: [spell(S1, "F")] }, [local(L1, S1, "G")], {}))[0].status).toBe("conflict");
  });

  it("untracked local rows are ignored", () => {
    expect(visible(ctx({}, [local(L2, null, "Mine")], {}))).toEqual([]);
  });
});
