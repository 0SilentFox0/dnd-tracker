import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "@/lib/utils/rules";
import { mergeRules, parseRules } from "@/lib/utils/rules/schema";
import { type TableRow,TablesRulesSchema } from "@/lib/utils/rules/tables-schema";

const rows = (n = 5): TableRow[] => Array.from({ length: n }, (_, i) => ({ max: (i + 1) * (100 / n), effects: [{ type: "damage", amount: 1 }] }));

const ok = (v: unknown) => TablesRulesSchema.safeParse(v).success;

describe("TablesRulesSchema", () => {
  it("accepts a valid 5-row table", () => {
    expect(ok({ critHead: rows() })).toBe(true);
  });

  it("rejects non-increasing max", () => {
    expect(ok({ critHead: [{ max: 50, effects: [] }, { max: 50, effects: [] }, { max: 100, effects: [] }] })).toBe(false);
  });

  it("rejects last max != 100", () => {
    expect(ok({ critHead: [{ max: 50, effects: [] }] })).toBe(false);
  });

  it("restricts effect types by slot", () => {
    expect(ok({ wrath: [{ max: 100, effects: [{ type: "damage", amount: 1 }] }] })).toBe(false);
    expect(ok({ critHead: [{ max: 100, effects: [{ type: "wounds", amount: 1 }] }] })).toBe(false);
    expect(ok({ wrath: [{ max: 100, effects: [{ type: "wounds", amount: 1 }] }] })).toBe(true);
  });

  it("rejects unknown condition key, >4 effects and long text", () => {
    expect(ok({ critHead: [{ max: 100, effects: [{ type: "condition", key: "nope", levels: 1 }] }] })).toBe(false);
    expect(ok({ critHead: [{ max: 100, effects: Array(5).fill({ type: "damage", amount: 1 }) }] })).toBe(false);
    expect(ok({ critHead: [{ max: 100, text: "x".repeat(201), effects: [] }] })).toBe(false);
  });

  it("accepts null slot", () => {
    expect(ok({ critHead: null })).toBe(true);
  });
});

describe("rules.tables wiring", () => {
  it("defaults to {}", () => {
    expect(DEFAULT_RULES.tables).toEqual({});
  });

  it("invalid raw section falls back to defaults", () => {
    expect(parseRules({ tables: { critHead: [{ max: 50, effects: [] }] } }).tables).toEqual({});
  });

  it("mergeRules sets then resets a slot with null", () => {
    const set = mergeRules(DEFAULT_RULES, { tables: { critHead: rows() } });

    expect(set.ok && set.rules.tables.critHead).toHaveLength(5);

    const reset = set.ok ? mergeRules(set.rules, { tables: { critHead: null } }) : set;

    expect(reset.ok && reset.rules.tables.critHead).toBeNull();
  });
});
