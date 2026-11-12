import { describe, expect, it } from "vitest";

import { assertNotPanicking } from "@/lib/utils/battle/turn";

const pending = (participantId: string, shouldSkipTurn: boolean) => ({
  participantId,
  d10Roll: 1,
  moraleResult: { shouldSkipTurn, hasExtraTurn: false, moralePositive: !shouldSkipTurn, message: "" },
});

describe("assertNotPanicking", () => {
  it("паніка цього учасника → action_used; інший учасник, без пропуску або без перевірки — ок", () => {
    expect(() => assertNotPanicking(pending("hero", true), "hero")).toThrow(expect.objectContaining({ code: "action_used" }));
    expect(() => assertNotPanicking(pending("gob", true), "hero")).not.toThrow();
    expect(() => assertNotPanicking(pending("hero", false), "hero")).not.toThrow();
    expect(() => assertNotPanicking(null, "hero")).not.toThrow();
  });
});
