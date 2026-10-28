import { describe, expect, it } from "vitest";

import { dedupePoint, type HeroPos, planEnter, planExit, planTravel } from "../travel";

const pos = (characterId: string, mapId: string, x: number, y: number): HeroPos => ({ characterId, mapId, x, y });

describe("planTravel", () => {
  const base = { mapId: "m1", to: { x: 0.8, y: 0.8 }, radius: 0.05, aspect: 1 };

  it("same-map hero gets a segment, others a point", () => {
    const positions = new Map<string, HeroPos>([
      ["a", pos("a", "m1", 0.1, 0.1)],
      ["b", pos("b", "m2", 0.3, 0.3)],
      ["c", null],
    ]);

    const plan = planTravel({ ...base, positions, characterIds: ["a", "b", "c"] });

    expect(plan.reveals[0].shape).toEqual({ t: "s", x1: 0.1, y1: 0.1, x2: 0.8, y2: 0.8 });
    expect(plan.reveals[1].shape).toEqual({ t: "p", x: 0.8, y: 0.8 });
    expect(plan.reveals[2].shape).toEqual({ t: "p", x: 0.8, y: 0.8 });
    expect(plan.moves.map((m) => m.from)).toEqual([positions.get("a"), positions.get("b"), null]);
  });

  it("two heroes with different positions get different segments", () => {
    const positions = new Map<string, HeroPos>([
      ["a", pos("a", "m1", 0.1, 0.1)],
      ["b", pos("b", "m1", 0.5, 0.2)],
    ]);

    const [ra, rb] = planTravel({ ...base, positions, characterIds: ["a", "b"] }).reveals;

    expect(ra.shape).not.toEqual(rb.shape);
  });

  it("clamps the destination to [0,1]", () => {
    const plan = planTravel({ ...base, to: { x: 1.4, y: -0.2 }, positions: new Map(), characterIds: ["a"] });

    expect(plan.moves[0].to).toEqual({ x: 1, y: 0 });
    expect(plan.reveals[0].shape).toEqual({ t: "p", x: 1, y: 0 });
  });
});

describe("planEnter / planExit", () => {
  it("enter puts every hero on the child entry point", () => {
    const plan = planEnter({ marker: { id: "k", mapId: "m1" }, childMap: { id: "m2", entryX: 0.4, entryY: 0.6 }, characterIds: ["a", "b"] });

    expect(plan.moves.map((m) => m.to)).toEqual([{ x: 0.4, y: 0.6 }, { x: 0.4, y: 0.6 }]);
    expect(plan.reveals.every((r) => r.shape.t === "p")).toBe(true);
  });

  it("exit goes to the parent marker", () => {
    const plan = planExit({ map: { id: "m2", parentMarker: { mapId: "m1", x: 0.2, y: 0.3 } }, characterIds: ["a"] });

    expect(plan.moves[0].to).toEqual({ x: 0.2, y: 0.3 });
    expect(plan.reveals[0].shape).toEqual({ t: "p", x: 0.2, y: 0.3 });
  });

  it("exit from a root map throws", () => {
    expect(() => planExit({ map: { id: "m1", parentMarker: null }, characterIds: ["a"] })).toThrow("NOT_NESTED");
  });
});

describe("dedupePoint", () => {
  it("true when an existing shape already covers the point", () => {
    expect(dedupePoint([{ t: "p", x: 0.5, y: 0.5 }], { x: 0.52, y: 0.5 }, 0.05, 1)).toBe(true);
    expect(dedupePoint([{ t: "p", x: 0.5, y: 0.5 }], { x: 0.7, y: 0.5 }, 0.05, 1)).toBe(false);
    expect(dedupePoint([], { x: 0.5, y: 0.5 }, 0.05, 1)).toBe(false);
  });
});
