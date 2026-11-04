import { describe, expect, it } from "vitest";

import { BUNDLE_TABLES, type BundleTable } from "@/lib/server/templates/bundle";
import { compareExposed, compareRows, type ExposedHashes, hashExposed, syncParity } from "@/lib/server/templates/legacy-migration/verify";
import type { SyncItem } from "@/lib/server/templates/sync/types";

const hashes = (patch: Partial<Record<BundleTable, Array<[string, string]>>> = {}) => Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, new Map(patch[t.key] ?? [])])) as ExposedHashes;

const item = (key: string, status: SyncItem["status"], ignored = false, scope: SyncItem["scope"] = "spells"): SyncItem => ({ scope, key, localId: null, name: key, status, changedFields: [], sourceHash: null, requires: [], visible: true, ignored });

const A = "c".padEnd(25, "a");

const B = "c".padEnd(25, "b");

const GONE = "c".padEnd(25, "z");

const rows = (spells: Array<Record<string, unknown>>) => Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, t.key === "spells" ? spells : []])) as never;

describe("compareExposed", () => {
  it("reports missing, extra and changed ids", () => {
    const diffs = compareExposed(hashes({ spells: [["a", "1"], ["b", "1"], ["c", "1"]] }), hashes({ spells: [["a", "1"], ["b", "2"], ["d", "1"]] }));

    expect(diffs).toEqual([
      { table: "spells", id: "b", kind: "changed" },
      { table: "spells", id: "c", kind: "missing" },
      { table: "spells", id: "d", kind: "extra" },
    ]);
  });

  it("is empty for equal hashes", () => {
    expect(compareExposed(hashes({ races: [["r", "x"]] }), hashes({ races: [["r", "x"]] }))).toEqual([]);
  });
});

describe("dangling reference normalisation", () => {
  it("treats a reference to a missing row as null on both sides", () => {
    const before = rows([{ id: A, name: "S", groupId: GONE }]);

    const after = rows([{ id: A, name: "S", groupId: null }]);

    expect(compareRows({ before, after })).toEqual([]);
  });

  it("still flags a live reference that changed", () => {
    const before = rows([{ id: A, name: "S", groupId: B }, { id: B, name: "G" }]);

    const after = rows([{ id: A, name: "S", groupId: null }, { id: B, name: "G" }]);

    expect(compareRows({ before, after })).toEqual([{ table: "spells", id: A, kind: "changed" }]);
  });

  it("hashExposed is stable for identical rows", () => {
    expect(hashExposed({ rows: rows([{ id: A, name: "S" }]) }).spells.get(A)).toBe(hashExposed({ rows: rows([{ id: A, name: "S" }]) }).spells.get(A));
  });
});

describe("syncParity", () => {
  it("ignores deletedLocally and equal statuses", () => {
    expect(syncParity([item("a", "updated"), item("b", "deletedLocally")], [item("a", "updated"), item("b", "deletedLocally")])).toEqual([]);
  });

  it("flags a status or ignored difference and missing items", () => {
    const diffs = syncParity([item("a", "conflict"), item("b", "new", true), item("c", "deletedInSource")], [item("a", "updated"), item("b", "new", false)]);

    expect(diffs.map((d) => d.key)).toEqual(["a", "b", "c"]);
  });

  it("allows a visible deletedLocally to reappear as pending new", () => {
    expect(syncParity([item("a", "deletedLocally")], [item("a", "new")])).toEqual([]);
  });

  it("flags an unexplained extra item", () => {
    expect(syncParity([], [item("x", "new")])).toEqual([{ scope: "spells", key: "x", after: "new|false" }]);
  });
});
