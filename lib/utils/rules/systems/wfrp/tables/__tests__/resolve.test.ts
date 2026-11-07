import { describe, expect, it } from "vitest";

import { CRIT_TABLE } from "../../combat/crit-table";
import { MISCAST_TABLE, WRATH_TABLE } from "../../magic/miscast-table";
import { DEFAULT_TABLES } from "../defaults";
import { resolveTable, rollSlot } from "../resolve";

import { mulberry32 } from "@/lib/utils/common/rng";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { TABLE_SLOTS, type TableRow,TablesRulesSchema } from "@/lib/utils/rules/tables-schema";

const rng = mulberry32(1);

const sum = (row: { effects: { type: string; amount?: number; levels?: number; key?: string }[] }, type: string) => row.effects.find((e) => e.type === type);

describe("DEFAULT_TABLES", () => {
  it("every slot passes TablesRulesSchema", () => {
    for (const slot of TABLE_SLOTS) {
      const rows = DEFAULT_TABLES[slot].map(({ textKey: _t, ...row }) => row);

      expect(TablesRulesSchema.safeParse({ [slot]: rows }).success).toBe(true);
    }
  });

  it("matches legacy crit tables at all boundaries", () => {
    const slots = { critHead: "head", critArm: "arm", critBody: "body", critLeg: "leg" } as const;

    for (const [slot, loc] of Object.entries(slots)) {
      for (const row of CRIT_TABLE[loc]) {
        for (const roll of [1, row.max, row.max + 1, 100]) {
          const old = CRIT_TABLE[loc].find((r) => roll <= r.max) ?? CRIT_TABLE[loc][CRIT_TABLE[loc].length - 1];

          const got = rollSlot(DEFAULT_RULES, slot as keyof typeof slots, rng, roll).row;

          expect(sum(got, "damage")?.amount).toBe(old.bonusDamage);

          const cond = sum(got, "condition")?.key ?? sum(got, "marker")?.key;

          expect(cond).toBe(old.markerKey);
        }
      }
    }
  });

  it("matches legacy miscast and wrath tables at all boundaries", () => {
    const legacy = { miscastMinor: MISCAST_TABLE.minor, miscastMajor: MISCAST_TABLE.major, wrath: WRATH_TABLE } as const;

    for (const [slot, table] of Object.entries(legacy)) {
      for (const row of table) {
        for (const roll of [1, row.max, row.max + 1, 100]) {
          const old = table.find((r) => roll <= r.max) ?? table[table.length - 1];

          const got = rollSlot(DEFAULT_RULES, slot as keyof typeof legacy, rng, roll).row;

          expect(sum(got, "wounds")?.amount).toBe(old.wounds);
          expect(sum(got, "condition")?.key).toBe(old.condition?.key);
          expect(sum(got, "condition")?.levels).toBe(old.condition?.levels);
        }
      }
    }
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
