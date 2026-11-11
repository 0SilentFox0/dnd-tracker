import { describe, expect, it } from "vitest";

import { corruptionThreshold } from "../threshold";

import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";

const withEffect = (key: "t" | "wp", amount: number) => ({ ...DEFAULT_CHARACTERISTICS, corruption: { points: 0, mutations: [{ id: "m", at: "2026-01-01T00:00:00.000Z", kind: "mental" as const, roll: 1, text: "x", effects: [{ type: "characteristic" as const, key, amount }] }] } });

describe("corruptionThreshold", () => {
  it("is TB + WPB", () => {
    expect(corruptionThreshold(DEFAULT_CHARACTERISTICS)).toBe(6);
    expect(corruptionThreshold(withEffect("t", -10))).toBe(5);
    expect(corruptionThreshold(withEffect("wp", 10))).toBe(7);
  });
});
