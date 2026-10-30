// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useIngredientPlan } from "../useIngredientPlan";
import { fakeScene } from "./fake-scene";

import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { IngredientStock } from "@/types/battle";

const spell = { ingredients: [{ name: "Diamond", qty: 1, minGp: 50, consumed: true, focus: false }] };

const stockOf = (over: Partial<IngredientStock> = {}): IngredientStock => ({ items: [], purseCp: 0, usedCp: 0, ...over });

function run(opts: { stock?: IngredientStock; enabled?: boolean; autoPay?: boolean; skip?: boolean; spell?: { ingredients: typeof spell.ingredients } }) {
  const scene = fakeScene();

  scene.battle.rules = { ...DEFAULT_RULES, spellIngredients: { enabled: opts.enabled ?? true, autoPay: opts.autoPay ?? false } };

  const caster = { ...scene.me, battleData: { ...scene.me.battleData, ingredientStock: opts.stock } };

  return renderHook(() => useIngredientPlan(caster, opts.spell ?? spell, opts.skip ?? false), { wrapper: scene.wrapper }).result.current;
}

describe("useIngredientPlan", () => {
  it("blocks on a shortage", () => {
    expect(run({ stock: stockOf() })).toMatchObject({ blocked: true, missing: "Diamond ×1 (50 gp)" });
  });

  it("is satisfied by a matching item", () => {
    const stock = stockOf({ items: [{ id: "i1", key: "diamond", name: "Diamond", worthGp: 50, qty: 1, used: 0 }] });

    expect(run({ stock })).toMatchObject({ blocked: false, payGp: 0 });
  });

  it("pays the shortage from the purse when auto-pay is on", () => {
    expect(run({ stock: stockOf({ purseCp: 10000 }), autoPay: true })).toMatchObject({ blocked: false, payGp: 50 });
  });

  it("is inactive without stock, with the rule off, when skipped, or without tracked ingredients", () => {
    expect(run({})).toBeNull();
    expect(run({ stock: stockOf(), enabled: false })).toBeNull();
    expect(run({ stock: stockOf(), skip: true })).toBeNull();
    expect(run({ stock: stockOf(), spell: { ingredients: [] } })).toBeNull();
  });
});
