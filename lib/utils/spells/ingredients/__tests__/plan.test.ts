import { describe, expect, it } from "vitest";

import { applyIngredientPlan, planIngredients } from "@/lib/utils/spells/ingredients/plan";
import type { SpellIngredient } from "@/lib/utils/spells/ingredients/types";
import type { IngredientStock } from "@/types/battle";

const diamond = (over: Partial<SpellIngredient> = {}): SpellIngredient => ({ name: "Diamond", qty: 1, minGp: 50, consumed: true, focus: false, ...over });

const stock = (over: Partial<IngredientStock> = {}): IngredientStock => ({ items: [], purseCp: 0, usedCp: 0, ...over });

const item = (id: string, worthGp: number, qty: number, used = 0, key = "diamond") => ({ id, key, name: key, worthGp, qty, used });

describe("planIngredients", () => {
  it("spends items when enough", () => {
    const plan = planIngredients([diamond({ qty: 2 })], stock({ items: [item("a", 50, 3)] }), { autoPay: true });

    expect(plan).toEqual({ ok: true, spendItems: { a: 2 }, spendCp: 0, missing: [] });
  });

  it("covers the remainder with the purse", () => {
    const plan = planIngredients([diamond({ qty: 3 })], stock({ items: [item("a", 50, 1)], purseCp: 10_000 }), { autoPay: true });

    expect(plan).toEqual({ ok: true, spendItems: { a: 1 }, spendCp: 10_000, missing: [] });
  });

  it("reports missing when the purse is short", () => {
    const plan = planIngredients([diamond({ qty: 3 })], stock({ items: [item("a", 50, 1)], purseCp: 9_999 }), { autoPay: true });

    expect(plan).toEqual({ ok: false, spendItems: {}, spendCp: 0, missing: [{ name: "Diamond", qty: 2, minGp: 50 }] });
  });

  it("autoPay false only uses items", () => {
    const plan = planIngredients([diamond()], stock({ purseCp: 100_000 }), { autoPay: false });

    expect(plan.ok).toBe(false);
    expect(plan.missing).toEqual([{ name: "Diamond", qty: 1, minGp: 50 }]);
  });

  it("cannot be paid for without minGp", () => {
    const plan = planIngredients([diamond({ minGp: undefined })], stock({ purseCp: 100_000 }), { autoPay: true });

    expect(plan.ok).toBe(false);
    expect(plan.missing).toEqual([{ name: "Diamond", qty: 1 }]);
  });

  it("ignores focus ingredients", () => {
    const plan = planIngredients([diamond({ focus: true })], stock(), { autoPay: true });

    expect(plan).toEqual({ ok: true, spendItems: {}, spendCp: 0, missing: [] });
  });

  it("handles two keys, sharing the purse budget", () => {
    const list = [diamond(), diamond({ name: "Ruby", minGp: 10 })];

    const ok = planIngredients(list, stock({ items: [item("a", 50, 1)], purseCp: 1_000 }), { autoPay: true });

    expect(ok).toEqual({ ok: true, spendItems: { a: 1 }, spendCp: 1_000, missing: [] });

    const short = planIngredients([diamond({ name: "Ruby", minGp: 10 }), diamond({ name: "Opal", minGp: 10 })], stock({ purseCp: 1_500 }), { autoPay: true });

    expect(short.missing).toEqual([{ name: "Opal", qty: 1, minGp: 10 }]);
  });

  it("picks the cheapest sufficient item first and skips too-cheap ones", () => {
    const plan = planIngredients([diamond()], stock({ items: [item("rich", 500, 1), item("cheap", 10, 1), item("fit", 60, 1)] }), { autoPay: true });

    expect(plan.spendItems).toEqual({ fit: 1 });
  });

  it("respects used and leaves the stock untouched", () => {
    const s = stock({ items: [item("a", 50, 2, 1)], purseCp: 0 });

    const snapshot = structuredClone(s);

    expect(planIngredients([diamond({ qty: 2 })], s, { autoPay: true }).ok).toBe(false);
    expect(planIngredients([diamond()], s, { autoPay: true }).spendItems).toEqual({ a: 1 });
    expect(s).toEqual(snapshot);
  });

  it("matches without minGp by key alone", () => {
    const plan = planIngredients([{ name: "Black Pearl", qty: 1, consumed: true, focus: false }], stock({ items: [item("p", 0, 1, 0, "black-pearl")] }), { autoPay: true });

    expect(plan.spendItems).toEqual({ p: 1 });
  });
});

describe("applyIngredientPlan", () => {
  it("increases used and usedCp without mutating", () => {
    const s = stock({ items: [item("a", 50, 3, 1)], purseCp: 500, usedCp: 100 });

    const next = applyIngredientPlan(s, { ok: true, spendItems: { a: 2 }, spendCp: 200, missing: [] });

    expect(next.items[0].used).toBe(3);
    expect(next.usedCp).toBe(300);
    expect(s.items[0].used).toBe(1);
    expect(s.usedCp).toBe(100);
  });
});
