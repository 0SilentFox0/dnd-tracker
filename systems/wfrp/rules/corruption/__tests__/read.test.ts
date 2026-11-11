import { describe, expect, it } from "vitest";

import { readCorruption } from "../read";

import { readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";

const mutation = { id: "m1", at: "2026-01-01T00:00:00.000Z", kind: "physical", roll: 12, text: "Scales", effects: [{ type: "characteristic", key: "t", amount: 5 }] };

const valid = { points: 3, mutations: [mutation] };

const withMutation = (patch: Record<string, unknown>) => readCorruption({ mutations: [{ ...mutation, ...patch }] });

const withEffect = (effect: unknown) => withMutation({ effects: [effect] });

const snapshot = { id: "g1", at: "2026-01-01T00:00:00.000Z", reason: "ruins", before: { points: 1 }, after: { points: 3 }, summary: { points: 2 } };

describe("readCorruption", () => {
  it("rejects non-objects, accepts {}", () => {
    for (const v of [undefined, null, "x", [], 5]) expect(readCorruption(v)).toBeUndefined();

    expect(readCorruption({})).toEqual({ points: 0, mutations: [] });
  });

  it("points bounds", () => {
    for (const points of [-1, 1000, 1.5]) expect(readCorruption({ points })).toBeUndefined();

    expect(readCorruption({ points: 999 })?.points).toBe(999);
  });

  it("mutation text, kind, roll and effects count", () => {
    expect(readCorruption(valid)).toEqual(valid);
    expect(withMutation({ text: { message: "wfrpCorruption.mutations.physical.1" } })?.mutations[0].text).toEqual({ message: "wfrpCorruption.mutations.physical.1" });

    for (const text of ["x".repeat(201), { message: "" }, { message: "x", params: {} }]) expect(withMutation({ text })).toBeUndefined();

    expect(withMutation({ kind: "spiritual" })).toBeUndefined();
    expect(withMutation({ roll: 0 })).toBeUndefined();
    expect(withMutation({ roll: 101 })).toBeUndefined();
    expect(withMutation({ effects: Array(4).fill({ type: "move", amount: 1 }) })).toBeUndefined();
  });

  it("effect bounds and shape", () => {
    for (const effect of [{ type: "characteristic", key: "zz", amount: 1 }, { type: "characteristic", key: "t", amount: 0 }, { type: "characteristic", key: "t", amount: 31 }, { type: "characteristic", key: "t", amount: -31 }, { type: "move", amount: 4 }, { type: "maxWounds", amount: -11 }, { type: "move", amount: 1, x: 1 }]) {
      expect(withEffect(effect)).toBeUndefined();
    }

    expect(withEffect({ type: "maxWounds", amount: -10 })).toBeDefined();
  });

  it("mutation count and duplicate ids", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ ...mutation, id: `m${i}` }));

    expect(readCorruption({ mutations: many(20) })).toBeDefined();
    expect(readCorruption({ mutations: many(21) })).toBeUndefined();
    expect(readCorruption({ mutations: [mutation, mutation] })).toBeUndefined();
  });

  it("last snapshot", () => {
    expect(readCorruption({ last: snapshot })?.last).toEqual(snapshot);

    for (const bad of [{ ...snapshot, id: undefined }, { ...snapshot, reason: "x".repeat(81) }, { ...snapshot, summary: 1 }, { ...snapshot, before: { points: 1000 } }]) expect(readCorruption({ points: 4, last: bad })).toEqual({ points: 4, mutations: [] });
  });

  it("drops extra keys", () => {
    expect(readCorruption({ points: 1, mutations: [], extra: 1 })).toEqual({ points: 1, mutations: [] });
  });
});

describe("readCharacteristics corruption", () => {
  it("keeps valid corruption alongside downtime, drops invalid", () => {
    const downtime = { ailments: [] };

    expect(readCharacteristics({ characteristics: { corruption: valid, downtime } })).toMatchObject({ corruption: valid, downtime });

    const bad = readCharacteristics({ characteristics: { corruption: { points: -1 }, move: 5 } });

    expect("corruption" in bad).toBe(false);
    expect(bad.move).toBe(5);
  });
});
