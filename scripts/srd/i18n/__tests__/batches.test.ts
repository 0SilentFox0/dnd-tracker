import { describe, expect, it } from "vitest";

import { inPhase, mergeApplied, missing, planBatches } from "../batches";
import type { CatalogEntry } from "../catalog";

const e = (hash: string, en: string, kinds: CatalogEntry["kinds"] = ["spells"], cls: CatalogEntry["cls"] = "d"): CatalogEntry => ({ hash, cls, en, kinds });

describe("planBatches", () => {
  it("не перевищує ліміт, але не залишає порожніх порцій і не губить записи", () => {
    const entries = [e("a", "x".repeat(10)), e("b", "x".repeat(10)), e("c", "x".repeat(30))];

    const batches = planBatches(entries, 20);

    expect(batches.map((b) => b.map((x) => x.hash))).toEqual([["a", "b"], ["c"]]);
    expect(planBatches([], 20)).toEqual([]);
  });
});

describe("inPhase / missing", () => {
  it("A: назви всіх видів і описи races/classes; B: решта описів", () => {
    expect(inPhase(e("1", "Fireball", ["spells"], "n"), "A")).toBe(true);
    expect(inPhase(e("2", "desc", ["classes"]), "A")).toBe(true);
    expect(inPhase(e("3", "desc", ["spells"]), "A")).toBe(false);
    expect(inPhase(e("3", "desc", ["spells"]), "B")).toBe(true);
  });

  it("missing повертає лише без перекладу", () => {
    expect(missing([e("a", "x"), e("b", "y")], { a: "ікс" }).map((x) => x.hash)).toEqual(["b"]);
  });
});

describe("mergeApplied", () => {
  const catalog = [e("a", "Range 30 feet"), e("b", "Alert", ["feats"], "n")];

  it("вливає валідні, невалідні й невідомі хеші відхиляє з кодами, повтор ідемпотентний", () => {
    const first = mergeApplied({}, [{ h: "a", t: "Дальність футів" }, { h: "b", t: "Пильність" }, { h: "zz", t: "?" }], catalog);

    expect(first.merged).toEqual({ b: "Пильність" });
    expect(first.rejected.map((r) => [r.h, r.issues])).toEqual([["a", ["numbers"]], ["zz", ["unknown"]]]);
    expect(mergeApplied(first.merged, [{ h: "b", t: "Пильність" }], catalog).merged).toEqual(first.merged);
  });
});
