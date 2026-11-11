import { describe, expect, it } from "vitest";

import { foldCorruption } from "../fold";
import type { MutationEffect } from "../types";

import { type Characteristics, DEFAULT_CHARACTERISTICS, readCharacteristics, value } from "@/systems/wfrp/rules/characteristics";

const make = (patch: Partial<Characteristics>, effects: MutationEffect[]): Characteristics => ({ ...DEFAULT_CHARACTERISTICS, ...patch, corruption: { points: 0, mutations: [{ id: "m", at: "2026-01-01T00:00:00.000Z", kind: "physical", roll: 1, text: "x", effects }] } });

const per = (patch: Record<string, number>, fill: number) => ({ ...DEFAULT_CHARACTERISTICS.base, ...Object.fromEntries(Object.keys(DEFAULT_CHARACTERISTICS.base).map((k) => [k, fill])), ...patch });

describe("foldCorruption", () => {
  it("without corruption returns the same values without the key", () => {
    expect(foldCorruption(DEFAULT_CHARACTERISTICS)).toEqual(DEFAULT_CHARACTERISTICS);
    expect("corruption" in foldCorruption(DEFAULT_CHARACTERISTICS)).toBe(false);
  });

  const cases: [string, Characteristics, (f: Characteristics) => void][] = [
    [
      "caps at 100 + 100",
      make({ base: per({}, 100), advances: per({}, 100) }, [{ type: "characteristic", key: "ws", amount: 30 }]),
      (f) => {
        expect(value(f, "ws")).toBe(200);
        expect(f.base.ws).toBeLessThanOrEqual(100);
        expect(f.advances.ws).toBeLessThanOrEqual(100);
      },
    ],
    [
      "floors at 1",
      make({ base: per({}, 5), advances: per({}, 0) }, [{ type: "characteristic", key: "ws", amount: -30 }]),
      (f) => {
        expect(value(f, "ws")).toBe(1);
        expect(f.base.ws).toBe(1);
        expect(f.advances.ws).toBe(0);
      },
    ],
    [
      "reduces base first",
      make({ base: per({}, 40), advances: per({}, 10) }, [{ type: "characteristic", key: "ag", amount: -5 }]),
      (f) => {
        expect(f.base.ag).toBe(35);
        expect(f.advances.ag).toBe(10);
      },
    ],
    [
      "folds move",
      make({ move: 4 }, [{ type: "move", amount: -1 }]),
      (f) => {
        expect(f.move).toBe(3);
      },
    ],
  ];

  it.each(cases)("%s", (_name, c, check) => {
    const folded = foldCorruption(c);

    check(folded);
    expect(readCharacteristics({ characteristics: folded })).toEqual(folded);
  });
});
