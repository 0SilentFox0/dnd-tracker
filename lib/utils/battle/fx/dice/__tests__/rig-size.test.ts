import { describe, expect, it } from "vitest";

import { computeRig, DIE_RADIUS, layoutDice, project, slotPosition, type Vec3 } from "@/lib/utils/battle/fx/dice";

const dieDiameterPx = (cols: number, rows: number, w: number, h: number) => {
  const rig = computeRig({ cols, rows }, { width: w, height: h });

  const c: Vec3 = [0, 0, 0];

  const [x0, y0] = project(rig, c, w, h);

  const [x1, y1] = project(rig, [rig.right[0] * DIE_RADIUS, rig.right[1] * DIE_RADIUS, rig.right[2] * DIE_RADIUS], w, h);

  return { rig, d: 2 * Math.hypot(x1 - x0, y1 - y0) };
};

describe("computeRig size", () => {
  it("широкий екран 2560×1300: кубик ≤ 96 px, сітка ≤ 60 % ширини", () => {
    const { rig, d } = dieDiameterPx(6, 2, 2560, 1300);

    expect(d).toBeLessThanOrEqual(96.5);

    const { slots } = layoutDice([Array.from({ length: 12 }, () => ({ sides: 6 as const, value: 1 }))]);

    const xs = slots.map((s) => project(rig, slotPosition(s, 2), 2560, 1300)[0]);

    expect(Math.max(...xs) - Math.min(...xs) + d).toBeLessThanOrEqual(0.6 * 2560 + 1);
  });

  it("телефон 390×844: кубик ≥ 40 px для малої сітки", () => {
    expect(dieDiameterPx(2, 1, 390, 844).d).toBeGreaterThanOrEqual(40);
  });

  it("два ряди не виходять за 50 % висоти", () => {
    const { rig, d } = dieDiameterPx(3, 2, 1000, 800);

    const ys = [0, 1].map((r) => project(rig, slotPosition({ sides: 6, value: 1, row: r, col: 0, rowLength: 3 }, 2), 1000, 800)[1]);

    expect(Math.abs(ys[1] - ys[0]) + d).toBeLessThanOrEqual(0.5 * 800 + 1);
  });
});
