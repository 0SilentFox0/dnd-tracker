import { describe, expect, it } from "vitest";

import { inPhase, mergeApplied, missing, planBatches } from "../lib/batches";

import type { KeyedString } from "@/lib/utils/templates/i18n/keys";

const e = (key: string, en: string, kind = "spells", cls: KeyedString["cls"] = "d"): KeyedString => ({ key, kind, slug: "x", fieldPath: key, cls, en });

describe("planBatches", () => {
  it("не перевищує ліміт, але не залишає порожніх порцій і не губить записи", () => {
    const entries = [e("a", "x".repeat(10)), e("b", "x".repeat(10)), e("c", "x".repeat(30))];

    const batches = planBatches(entries, 20);

    expect(batches.map((b) => b.map((x) => x.key))).toEqual([["a", "b"], ["c"]]);
    expect(planBatches([], 20)).toEqual([]);
  });
});

describe("inPhase / missing", () => {
  it("A: назви всіх видів і описи races/classes; B: решта описів", () => {
    expect(inPhase(e("1", "Fireball", "spells", "n"), "A")).toBe(true);
    expect(inPhase(e("2", "desc", "classes"), "A")).toBe(true);
    expect(inPhase(e("3", "desc", "spells"), "A")).toBe(false);
    expect(inPhase(e("3", "desc", "spells"), "B")).toBe(true);
  });

  it("missing повертає лише без перекладу", () => {
    expect(missing([e("a", "x"), e("b", "y")], { a: { text: "ікс", en: "x" } }).map((x) => x.key)).toEqual(["b"]);
  });
});

describe("mergeApplied", () => {
  const catalog = [e("a", "Range 30 feet"), e("b", "Alert", "feats", "n")];

  it("вливає валідні, невалідні й невідомі хеші відхиляє з кодами, повтор ідемпотентний", () => {
    const first = mergeApplied({}, [{ key: "a", text: "Дальність футів" }, { key: "b", text: "Пильність" }, { key: "zz", text: "?" }], catalog);

    expect(first.merged).toEqual({ b: { text: "Пильність", en: "Alert" } });
    expect(first.rejected.map((r) => [r.key, r.issues])).toEqual([["a", ["numbers"]], ["zz", ["unknown"]]]);
    expect(mergeApplied(first.merged, [{ key: "b", text: "Пильність" }], catalog).merged).toEqual(first.merged);
  });

  it("автовиправляє курсивні назви за каталогом перед валідацією", () => {
    const cat = [e("n1", "Fireball", "spells", "n"), e("d1", "Cast *Fireball* now")];

    expect(mergeApplied({ n1: { text: "Вогняна куля", en: "Fireball" } }, [{ key: "d1", text: "Накладіть *Вогняну кулю* зараз" }], cat).merged.d1.text).toBe("Накладіть *Вогняна куля* зараз");
  });
});
