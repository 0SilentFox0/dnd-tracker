import { describe, expect, it } from "vitest";

import { clamp01, envelope, fadeOut, pulse } from "@/components/battle/fx/runtime/easing";
import { perimeter } from "@/components/battle/fx/runtime/frame-kit";
import { cubicBezier, stepBodies } from "@/components/battle/fx/runtime/geometry";

const box = { x: 10, y: 20, w: 100, h: 50 };

describe("perimeter", () => {
  it("walks the border clockwise from the top-left, normals point inward", () => {
    const at = (t: number) => {
      const p = perimeter(box, t);

      return [Math.round(p.x), Math.round(p.y), p.nx, p.ny].map((v) => v + 0);
    };

    expect(at(0)).toEqual([10, 20, 0, 1]);
    expect(at(125 / 300)).toEqual([110, 45, -1, 0]);
    expect(at(200 / 300)).toEqual([60, 70, 0, -1]);
    expect(at(275 / 300)).toEqual([10, 45, 1, 0]);
  });

  it("wraps t outside [0, 1)", () => {
    expect(perimeter(box, 1.25)).toEqual(perimeter(box, 0.25));
    expect(perimeter(box, -0.75)).toEqual(perimeter(box, 0.25));
  });
});

describe("easing", () => {
  it("clamp01 / envelope / pulse / fadeOut", () => {
    expect([clamp01(-1), clamp01(0.4), clamp01(2)]).toEqual([0, 0.4, 1]);
    expect([envelope(0, 0.2, 0.3), envelope(0.1, 0.2, 0.3), envelope(0.5, 0.2, 0.3), envelope(1, 0.2, 0.3)]).toEqual([0, 0.5, 1, 0]);
    expect([pulse(0.1, 0.2), pulse(0.2, 0.2), pulse(0.6, 0.2), pulse(1, 0.2)]).toEqual([0.5, 1, 0.5, 0]);
    expect(pulse(0.45, 0.05, 0.4)).toBe(0);
    expect([fadeOut(0.2, 0.5), fadeOut(0.75, 0.5), fadeOut(1, 0.5)]).toEqual([1, 0.5, 0]);
  });
});

describe("cubicBezier", () => {
  it("hits both ends and the symmetric midpoint", () => {
    const p = [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 0 }] as const;

    expect(cubicBezier(p, 0)).toEqual({ x: 0, y: 0 });
    expect(cubicBezier(p, 1)).toEqual({ x: 10, y: 0 });
    expect(cubicBezier(p, 0.5)).toEqual({ x: 5, y: 7.5 });
  });
});

describe("stepBodies", () => {
  it("integrates gravity and spin", () => {
    const b = { x: 0, y: 0, vx: 10, vy: 0, rot: 0, spin: 2 };

    stepBodies([b], 0.5, 100);

    expect(b).toMatchObject({ vy: 50, x: 5, y: 25, rot: 1 });
  });

  it("bounces on the floor, then rests", () => {
    const b = { x: 0, y: 99, vx: 10, vy: 200, spin: 4, rot: 0, rest: false };

    stepBodies([b], 0.01, 0, 100);

    expect(b).toMatchObject({ y: 100, vy: -70, vx: 5, spin: 2, rest: false });

    b.vy = 50;
    stepBodies([b], 0.1, 0, 100);

    expect(b.rest).toBe(true);
  });
});
