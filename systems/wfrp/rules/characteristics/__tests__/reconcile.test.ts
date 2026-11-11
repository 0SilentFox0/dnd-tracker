import { describe, expect, it } from "vitest";

import { WFRP_SYSTEM } from "../../../index";
import { DEFAULT_CHARACTERISTICS } from "../keys";
import { reconcileCharacteristics } from "../reconcile";

const forged = { ...DEFAULT_CHARACTERISTICS, talents: { forged: 3 }, ledger: [{ id: "forged", at: "2026-01-01T00:00:00.000Z", kind: "xp", amount: 999 }], spentArchived: 50 };

describe("reconcileCharacteristics systemBaseline (D66)", () => {
  const stored = { ...DEFAULT_CHARACTERISTICS, talents: { real: 1 } };

  it.each([true, false])("a forged baseline's ledger/talents do not change the result (isDM=%s)", (isDM) => {
    const withBaseline = reconcileCharacteristics(stored, stored, { isDM, baseline: forged });

    const without = reconcileCharacteristics(stored, stored, { isDM, baseline: undefined });

    expect(withBaseline).toEqual(without);
    expect(JSON.stringify(withBaseline)).not.toContain("forged");
  });

  it("a player's baseline is ignored: server-owned fields are restored", () => {
    const result = reconcileCharacteristics(stored, forged, { isDM: false, baseline: forged }) as typeof stored;

    expect(result.talents).toEqual({ real: 1 });
    expect(result.ledger).toEqual([]);
  });
});

describe("wfrp characteristics.defaults (D68)", () => {
  it("returns a fresh copy each call", () => {
    const a = WFRP_SYSTEM.characteristics.defaults() as typeof DEFAULT_CHARACTERISTICS;

    a.base.ws = 99;

    expect(DEFAULT_CHARACTERISTICS.base.ws).toBe(30);
    expect(WFRP_SYSTEM.characteristics.defaults()).toEqual(DEFAULT_CHARACTERISTICS);
  });
});
