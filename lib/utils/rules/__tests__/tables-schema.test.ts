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

  it("accepts signed mutation effects", () => {
    const eff = [{ type: "characteristic", key: "ag", amount: -5 }, { type: "move", amount: -1 }, { type: "maxWounds", amount: 2 }];

    expect(ok({ mutationPhysical: [{ max: 100, effects: eff }] })).toBe(true);
    expect(ok({ mutationMental: null })).toBe(true);
  });

  it.each([
    ["zero amount", { type: "characteristic", key: "ag", amount: 0 }],
    ["amount over limit", { type: "characteristic", key: "ag", amount: 31 }],
    ["move over limit", { type: "move", amount: 4 }],
    ["maxWounds under limit", { type: "maxWounds", amount: -11 }],
    ["unknown key", { type: "characteristic", key: "zz", amount: 5 }],
    ["wounds in a mutation slot", { type: "wounds", amount: 1 }],
  ])("rejects mutation effect: %s", (_n, effect) => {
    expect(ok({ mutationMental: [{ max: 100, effects: [effect] }] })).toBe(false);
  });

  it("rejects 4 mutation effects and characteristic outside mutation slots", () => {
    expect(ok({ mutationPhysical: [{ max: 100, effects: Array(4).fill({ type: "move", amount: 1 }) }] })).toBe(false);
    expect(ok({ critHead: [{ max: 100, effects: [{ type: "characteristic", key: "ag", amount: 5 }] }] })).toBe(false);
    expect(ok({ downtimeEvent: [{ max: 100, effects: [{ type: "characteristic", key: "ag", amount: 5 }] }] })).toBe(false);
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

    expect(reset.ok && "critHead" in reset.rules.tables).toBe(false);
  });

  it("mergeRules keeps other slots on a mutation patch and resets with null", () => {
    const mutation: TableRow[] = [{ max: 100, effects: [{ type: "move", amount: -1 }] }];

    const base = mergeRules(DEFAULT_RULES, { tables: { critHead: rows() } });

    const set = base.ok ? mergeRules(base.rules, { tables: { mutationMental: mutation } }) : base;

    expect(set.ok && set.rules.tables.critHead).toHaveLength(5);
    expect(set.ok && set.rules.tables.mutationMental).toEqual(mutation);

    const reset = set.ok ? mergeRules(set.rules, { tables: { mutationMental: null } }) : set;

    expect(reset.ok && "mutationMental" in reset.rules.tables).toBe(false);
    expect(reset.ok && reset.rules.tables.critHead).toHaveLength(5);
  });
});
