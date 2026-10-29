import { describe, expect, it, vi } from "vitest";

import { dispatchMapClick, mapClickHandlers, sameCell } from "../map-click";

const deps = () => ({
  current: { basicInfo: { id: "me" } } as never,
  turn: { round: 2, index: 3 },
  aim: { onAim: vi.fn() } as never,
  pick: { onPick: vi.fn() } as never,
  move: vi.fn(),
  requestAttack: vi.fn(),
  show: vi.fn(),
  select: vi.fn(),
  arm: vi.fn(),
});

describe("mapClickHandlers", () => {
  it("move: free додається лише коли true", () => {
    const d = deps();

    dispatchMapClick(mapClickHandlers(d), { kind: "move", participantId: "a", to: { x: 1, y: 2 }, free: false });
    dispatchMapClick(mapClickHandlers(d), { kind: "move", participantId: "a", to: { x: 1, y: 2 }, free: true });

    expect(d.move).toHaveBeenNthCalledWith(1, { participantId: "a", to: { x: 1, y: 2 } });
    expect(d.move).toHaveBeenNthCalledWith(2, { participantId: "a", to: { x: 1, y: 2 }, free: true });
  });

  it("attack: намір з актором, раундом і ходом", () => {
    const d = deps();

    dispatchMapClick(mapClickHandlers(d), { kind: "attack", targetId: "t", attackId: "x" });

    expect(d.requestAttack).toHaveBeenCalledWith({ targetId: "t", attackId: "x", actorId: "me", round: 2, turnIndex: 3 });
  });

  it("reject/select/arm/none", () => {
    const d = deps();

    const h = mapClickHandlers(d);

    dispatchMapClick(h, { kind: "reject", reason: "no" });
    dispatchMapClick(h, { kind: "select", id: "s" });
    dispatchMapClick(h, { kind: "arm", id: "r" });
    dispatchMapClick(h, { kind: "none" });

    expect([d.show, d.select, d.arm].map((f) => f.mock.calls[0][0])).toEqual(["no", "s", "r"]);
  });
});

describe("sameCell", () => {
  it("порівнює за координатами", () => {
    expect(sameCell({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(true);
    expect(sameCell({ x: 1, y: 1 }, null)).toBe(false);
    expect(sameCell(null, null)).toBe(true);
  });
});
