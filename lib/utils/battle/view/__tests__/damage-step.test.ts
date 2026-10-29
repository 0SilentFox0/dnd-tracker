import { describe, expect, it } from "vitest";

import { textOf } from "@/lib/i18n/test/text";
import { formatDamageStep } from "@/lib/utils/battle/view/damage-step";

describe("formatDamageStep", () => {
  it.each([
    [{ kind: "dice", value: 7, after: 7 }, "7 → 7"],
    [{ kind: "flat", value: 3, after: 10 }, "+3 → 10"],
    [{ kind: "flat", value: -2, after: 8 }, "-2 → 8"],
    [{ kind: "percent", value: 25, after: 12 }, "+25% → 12"],
    [{ kind: "percent", value: -50, after: 6 }, "-50% → 6"],
    [{ kind: "multiplier", value: 0.5, after: 3 }, "×0.5 → 3"],
    [{ kind: "multiplier", value: 0.6935483870967742, after: 3 }, "×0.69 → 3"],
    [{ kind: "immunity", value: 0, after: 0 }, "імунітет → 0"],
  ] as const)("%o → %s", (step, text) => {
    expect(textOf(formatDamageStep(step))).toBe(text);
  });
});
