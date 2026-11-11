import { describe, expect, it } from "vitest";

import { woundsMax } from "../derive";
import { DEFAULT_CHARACTERISTICS } from "../keys";
import { wfrpSheetBlock } from "../sheet-block";

describe("wfrpSheetBlock sin", () => {
  it("reads Sin from resources, 0 when absent", () => {
    expect(wfrpSheetBlock({ characteristics: DEFAULT_CHARACTERISTICS, resources: { sin: 4 } }).sin).toBe(4);
    expect(wfrpSheetBlock({ characteristics: DEFAULT_CHARACTERISTICS, resources: {} }).sin).toBe(0);
  });
});

describe("wfrpSheetBlock corruption", () => {
  const mutation = { id: "m", at: "2026-01-01T00:00:00.000Z", kind: "physical" as const, roll: 1, text: "x", effects: [{ type: "characteristic" as const, key: "ws" as const, amount: -10 }, { type: "move" as const, amount: -1 }, { type: "maxWounds" as const, amount: 2 }] };

  it("exposes mod, effective move/wounds and the corruption block", () => {
    const block = wfrpSheetBlock({ characteristics: { ...DEFAULT_CHARACTERISTICS, corruption: { points: 4, mutations: [mutation] } }, resources: {} });

    expect(block.characteristics.find((c) => c.key === "ws")).toMatchObject({ base: 30, advances: 0, value: 20, mod: -10 });
    expect(block.characteristics.find((c) => c.key === "t")?.mod).toBe(0);
    expect(block.move.value).toBe(3);
    expect(block.wounds.max).toBe(woundsMax(DEFAULT_CHARACTERISTICS) + 2);
    expect(block.corruption).toEqual({ points: 4, threshold: 6, mutations: [mutation] });
  });

  it("defaults without corruption", () => {
    expect(wfrpSheetBlock({ characteristics: DEFAULT_CHARACTERISTICS, resources: {} }).corruption).toEqual({ points: 0, threshold: 6, mutations: [] });
  });
});
