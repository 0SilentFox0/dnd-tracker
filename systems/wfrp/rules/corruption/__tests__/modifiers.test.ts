import { describe, expect, it } from "vitest";

import { EMPTY_MODIFIERS, modifiersOf } from "../modifiers";
import type { CorruptionState, MutationEffect } from "../types";

const state = (...groups: MutationEffect[][]): CorruptionState => ({ points: 0, mutations: groups.map((effects, i) => ({ id: `m${i}`, at: "2026-01-01T00:00:00.000Z", kind: "physical", roll: 1, text: "x", effects })) });

describe("modifiersOf", () => {
  it("undefined gives empty modifiers", () => {
    expect(modifiersOf(undefined)).toEqual(EMPTY_MODIFIERS);
  });

  it("sums effects across mutations", () => {
    const s = state(
      [
        { type: "characteristic", key: "t", amount: -5 },
        { type: "move", amount: -1 },
      ],
      [
        { type: "characteristic", key: "t", amount: 10 },
        { type: "maxWounds", amount: 2 },
      ],
    );

    expect(modifiersOf(s)).toEqual({ characteristics: { t: 5 }, move: -1, maxWounds: 2 });
  });

  it("drops characteristics that cancel out", () => {
    const s = state([{ type: "characteristic", key: "t", amount: 5 }], [{ type: "characteristic", key: "t", amount: -5 }]);

    expect("t" in modifiersOf(s).characteristics).toBe(false);
  });
});
