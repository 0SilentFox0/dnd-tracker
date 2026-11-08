import { describe, expect, it } from "vitest";

import { DEFAULT_TABLES } from "../defaults";
import { resolveTable } from "../resolve";

import { TABLE_SLOTS, type TableRow,TablesRulesSchema } from "@/lib/utils/rules/tables-schema";

describe("DEFAULT_TABLES", () => {
  it("every slot passes TablesRulesSchema", () => {
    for (const slot of TABLE_SLOTS) {
      const rows = DEFAULT_TABLES[slot].map(({ textKey: _t, ...row }) => row);

      expect(TablesRulesSchema.safeParse({ [slot]: rows }).success).toBe(true);
    }
  });

  it("keeps the shipped row counts", () => {
    expect(TABLE_SLOTS.map((slot) => DEFAULT_TABLES[slot].length)).toEqual(TABLE_SLOTS.map((slot) => (slot === "wrath" ? 4 : slot === "downtimeEvent" ? 10 : 5)));
  });

  it("uses legacy text keys", () => {
    expect(DEFAULT_TABLES.critLeg[2].textKey).toBe("battleWfrp.crit.leg.3");
    expect(DEFAULT_TABLES.miscastMajor[0].textKey).toBe("wfrpMagic.miscast.major.1");
    expect(DEFAULT_TABLES.wrath[3].textKey).toBe("wfrpMagic.miscast.wrath.4");
  });
});

describe("resolveTable", () => {
  const rows: TableRow[] = [{ max: 100, effects: [] }];

  it("returns campaign rows only for the overridden slot", () => {
    const rules = { tables: { critHead: rows } };

    expect(resolveTable(rules, "critHead")).toBe(rows);
    expect(resolveTable(rules, "critArm")).toBe(DEFAULT_TABLES.critArm);
  });

  it("null falls back to defaults", () => {
    expect(resolveTable({ tables: { critHead: null } }, "critHead")).toBe(DEFAULT_TABLES.critHead);
  });
});
