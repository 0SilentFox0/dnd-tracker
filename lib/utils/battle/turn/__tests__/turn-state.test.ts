import { describe, expect, it } from "vitest";

import { resetTurnState } from "../turn-state";

import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";

describe("resetTurnState", () => {
  it("clears per-turn counters and remembers the start position", () => {
    const p = placed("a", { side: "ally", at: { x: 2, y: 3 } });

    const dirty = {
      ...p,
      battleData: { ...p.battleData, retaliationsUsed: 2, movementUsed: 15, returnedThisTurn: true },
    };

    const next = resetTurnState(dirty);

    expect(next.retaliationsUsed).toBe(0);
    expect(next.movementUsed).toBe(0);
    expect(next.turnStartPosition).toEqual({ x: 2, y: 3 });
    expect(next.returnedThisTurn).toBeUndefined();
  });

  it("does not add movementUsed when it was unset", () => {
    const next = resetTurnState(placed("a", { side: "ally", at: { x: 0, y: 0 } }));

    expect("movementUsed" in next && next.movementUsed).toBeFalsy();
  });
});
