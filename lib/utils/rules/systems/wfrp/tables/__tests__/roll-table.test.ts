import { describe, expect, it } from "vitest";

import { CRIT_TABLE, rollCrit } from "../../combat/crit-table";
import { rollTable } from "../roll-table";

import { mulberry32 } from "@/lib/utils/common/rng";

const rows = [{ max: 20 }, { max: 40 }, { max: 100 }];

const rng = mulberry32(1);

describe("rollTable", () => {
  it.each([
    [1, 0],
    [20, 0],
    [21, 1],
    [40, 1],
    [41, 2],
    [100, 2],
  ])("roll %i picks row %i", (preset, index) => {
    const r = rollTable(rows, rng, preset);

    expect(r).toEqual({ index, row: rows[index], roll: preset });
  });

  it("rolls with rng when no preset", () => {
    const r = rollTable(rows, () => 0.5);

    expect(r.roll).toBe(51);
    expect(r.index).toBe(2);
  });
});

describe("rollCrit through rollTable", () => {
  it.each(["head", "arm", "body", "leg"] as const)("%s keeps ids and keys across presets", (loc) => {
    for (const preset of [1, 20, 21, 40, 41, 60, 61, 80, 81, 100]) {
      const index = CRIT_TABLE[loc].findIndex((r) => preset <= r.max);

      const crit = rollCrit(loc, rng, preset);

      expect(crit.id).toBe(`${loc}.${index + 1}`);
      expect(crit.textKey).toBe(`battleWfrp.crit.${loc}.${index + 1}`);
      expect(crit.bonusDamage).toBe(CRIT_TABLE[loc][index].bonusDamage);
    }
  });
});
