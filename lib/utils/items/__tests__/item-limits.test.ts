import { describe, expect, it, vi } from "vitest";

import { ITEM_LIMITS, ItemModifierType } from "@/lib/constants/artifacts";
import { itemStatsFromRow,ItemStatsSchema } from "@/lib/utils/items/item-stats";
import { classPoolKey, consumablePoolKey, grantPoolKey, spellGrantFields, spellPoolKey } from "@/lib/utils/items/pools";

const rowOf = (stats: unknown) => ({ modifiers: [{ type: ItemModifierType.STATS, value: JSON.stringify(stats) }] });

const withSpell = (patch: Record<string, unknown>) => ({ consumable: true, charges: { max: 3, rest: null }, spells: [{ spellId: "s", cost: 1, ...patch }] });

type Case = [string, (v: number) => unknown, readonly number[]];

const [chMin, chMax] = ITEM_LIMITS.charges;

const cases: Case[] = [
  ["cost", (v) => withSpell({ cost: v }), ITEM_LIMITS.cost],
  ["castLevel", (v) => withSpell({ castLevel: v }), ITEM_LIMITS.castLevel],
  ["dc", (v) => withSpell({ dc: v }), ITEM_LIMITS.dc],
  ["attackBonus", (v) => withSpell({ attackBonus: v }), ITEM_LIMITS.attackBonus],
  ["charges", (v) => ({ charges: { max: v, rest: "long" } }), [chMin, chMax]],
  ["upcast.extraCost", (v) => withSpell({ castLevel: 1, upcast: { maxLevel: 5, extraCost: v } }), ITEM_LIMITS.upcastExtraCost],
  ["upcast.maxLevel", (v) => withSpell({ castLevel: 0, upcast: { maxLevel: v, extraCost: 1 } }), ITEM_LIMITS.upcastMaxLevel],
];

describe("ITEM_LIMITS: readStats and zod agree", () => {
  for (const [name, make, [min, max]] of cases) {
    for (const v of [min - 1, min, max, max + 1]) {
      it(`${name}=${v}`, () => {
        const stats = make(v);

        expect(!!itemStatsFromRow(rowOf(stats))).toBe(ItemStatsSchema.safeParse(stats).success);
      });
    }
  }

  it("option label length and count", () => {
    for (const label of ["a".repeat(ITEM_LIMITS.label), "a".repeat(ITEM_LIMITS.label + 1)]) {
      const stats = { parameter: { kind: "damageType", options: [{ key: "fire", label }] } };

      expect(!!itemStatsFromRow(rowOf(stats))).toBe(ItemStatsSchema.safeParse(stats).success);
    }

    for (const n of [ITEM_LIMITS.options, ITEM_LIMITS.options + 1]) {
      const stats = { parameter: { kind: "damageType", options: Array.from({ length: n }, (_, i) => ({ key: `k${i}`, label: "x" })) } };

      expect(!!itemStatsFromRow(rowOf(stats))).toBe(ItemStatsSchema.safeParse(stats).success);
    }
  });

  it("key pattern", () => {
    for (const key of ["fire", "Fire", "1x", "a".repeat(40), "a".repeat(41)]) {
      const stats = { parameter: { kind: "damageType", options: [{ key, label: "x" }] } };

      expect(!!itemStatsFromRow(rowOf(stats))).toBe(ItemStatsSchema.safeParse(stats).success);
    }
  });
});

describe("itemStatsFromRow cache", () => {
  it("parses once per row object", () => {
    const spy = vi.spyOn(JSON, "parse");

    const row = rowOf({ attunement: true });

    const first = itemStatsFromRow(row);

    itemStatsFromRow(row);
    itemStatsFromRow(row);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(itemStatsFromRow(row)).toBe(first);
    spy.mockRestore();
  });

  it("caches null results", () => {
    const spy = vi.spyOn(JSON, "parse");

    const row = { modifiers: [{ type: ItemModifierType.STATS, value: "{bad" }] };

    expect(itemStatsFromRow(row)).toBeNull();
    expect(itemStatsFromRow(row)).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("pool keys and grant fields", () => {
  it("keep the persisted literals", () => {
    expect(spellPoolKey("x")).toBe("pool:spell:x");
    expect(classPoolKey("monk", "ki")).toBe("pool:monk:ki");
    expect(consumablePoolKey("i")).toBe("pool:consumable:i");
    expect(grantPoolKey("a:b:c")).toBe("pool:grant:a:b:c");
    expect(grantPoolKey("a:b:c", "my pool")).toBe("pool:grant:a:b:shared:my%20pool");
  });

  it("spellGrantFields keeps only defined fields", () => {
    expect(spellGrantFields({})).toEqual({});
    expect(spellGrantFields({ castLevel: 0, dc: 12, upcast: { maxLevel: 3, extraCost: 1 } })).toEqual({ castLevel: 0, dc: 12, upcast: { maxLevel: 3, extraCost: 1 } });
  });
});
