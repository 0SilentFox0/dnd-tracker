import { describe, expect, it } from "vitest";

import { sizeStep, traitEffects } from "../read";
import { trait } from "./fixtures";

describe("traitEffects", () => {
  it("takes passive unconditional trait effects only", () => {
    const ward = { kind: "wfrpWard", value: 8 };

    const list = [
      trait([ward, { kind: "note", text: "x" }]),
      trait([{ kind: "wfrpWard", value: 3 }], { condition: { type: "selfHpBelow", percent: 50 } as never }),
      trait([{ kind: "wfrpWard", value: 2 }], { trigger: { event: "turnStart" } }),
    ];

    expect(traitEffects(list)).toEqual([ward]);
  });
});

describe("sizeStep", () => {
  it("indexes the size scale, defaulting to average", () => {
    expect(sizeStep(undefined)).toBe(3);
    expect(sizeStep("average")).toBe(3);
    expect(sizeStep("tiny")).toBe(0);
    expect(sizeStep("monstrous")).toBe(6);
  });
});
