import { describe, expect, it } from "vitest";

import { type PercentileTestInput,resolvePercentileTest } from "../resolve";

import { mulberry32 } from "@/lib/utils/common/rng";

type Row = [string, Partial<PercentileTestInput> & { target: number }, number, Record<string, unknown>];

const rows: Row[] = [
  ["auto success on 05", { target: 45 }, 5, { outcome: "success", auto: "success" }],
  ["06 over target 3 is a plain failure", { target: 3 }, 6, { outcome: "failure", auto: null }],
  ["95 is not auto failure", { target: 45 }, 95, { outcome: "failure", auto: null }],
  ["96 is auto failure", { target: 45 }, 96, { outcome: "failure", auto: "failure" }],
  ["96 fails even with target 120", { target: 120 }, 96, { outcome: "failure", auto: "failure", sl: 0 }],
  ["100 doubles fumbles", { target: 120, doubles: true }, 100, { outcome: "fumble", doubles: true }],
  ["100 without doubles fails", { target: 120 }, 100, { outcome: "failure", doubles: true }],
  ["11 doubles is critical", { target: 45, doubles: true }, 11, { outcome: "critical", sl: 3 }],
  ["11 without doubles is success", { target: 45 }, 11, { outcome: "success", sl: 3 }],
  ["55 doubles fumbles", { target: 45, doubles: true }, 55, { outcome: "fumble", sl: -1 }],
  ["05 is not a double", { target: 45, doubles: true }, 5, { outcome: "success", doubles: false }],
  ["auto success at target 0 has sl 0", { target: 0 }, 5, { outcome: "success", sl: 0 }],
  ["negative modifier turns a success into a failure", { target: 45, modifier: -30 }, 20, { outcome: "failure", target: 15, sl: -1 }],
  ["positive modifier turns a failure into a success", { target: 30, modifier: 60 }, 50, { outcome: "success", target: 90, sl: 4 }],
  ["positive modifier adds SL", { target: 45, modifier: 20 }, 20, { outcome: "success", target: 65, sl: 4 }],
  ["modifier cannot push the target below zero", { target: 10, modifier: -30 }, 20, { outcome: "failure", target: 0 }],
  ["roll equal to target succeeds", { target: 45 }, 45, { outcome: "success", sl: 0 }],
  ["advantage picks the reversed roll", { target: 45, mode: "advantage" }, 71, { reversed: true, roll: 17, rawRoll: 71, outcome: "success" }],
  ["advantage keeps a better raw roll", { target: 45, mode: "advantage" }, 17, { reversed: false, roll: 17, outcome: "success" }],
  ["disadvantage picks the reversed roll", { target: 45, mode: "disadvantage" }, 17, { reversed: true, roll: 71, rawRoll: 17, outcome: "failure" }],
  ["advantage reverses into auto success", { target: 45, mode: "advantage" }, 50, { reversed: true, roll: 5, auto: "success", outcome: "success" }],
  ["advantage prefers critical", { target: 45, mode: "advantage", doubles: true }, 22, { outcome: "critical", reversed: false }],
  ["advantage tie on palindrome is not reversed", { target: 45, mode: "advantage" }, 44, { reversed: false, roll: 44 }],
];

describe("resolvePercentileTest", () => {
  it.each(rows)("%s", (_name, input, presetRoll, expected) => {
    const result = resolvePercentileTest({ rng: mulberry32(1), presetRoll, ...input });

    expect(result).toMatchObject(expected);
  });

  it("defaults to normal mode and echoes the target", () => {
    const result = resolvePercentileTest({ target: 45, rng: mulberry32(1), presetRoll: 30 });

    expect(result).toMatchObject({ mode: "normal", target: 45, rawRoll: 30, roll: 30, reversed: false });
  });

  it("rolls from the rng when no preset is given", () => {
    const result = resolvePercentileTest({ target: 50, rng: mulberry32(7) });

    expect(result.rawRoll).toBeGreaterThanOrEqual(1);
    expect(result.rawRoll).toBeLessThanOrEqual(100);
  });
});
