import { describe, expect, it } from "vitest";

import { badgeFontPx } from "@/components/battle/fx/dice/badges";
import { computeRig, projectedDiePx } from "@/lib/utils/battle/fx/dice";

const diePx = (cols: number, rows: number, width: number, height: number) => projectedDiePx(computeRig({ cols, rows }, { width, height }), { width, height });

describe("projectedDiePx", () => {
  it("телефон 390×844, 6 кубиків: кубик < 44 px, шрифт бейджа < 25 px", () => {
    const d = diePx(6, 1, 390, 844);

    expect(d).toBeLessThan(44);
    expect(badgeFontPx(d)).toBeLessThan(25);
    expect(badgeFontPx(d)).toBeGreaterThanOrEqual(14);
  });

  it("десктоп 2560×1300, один d20: шрифт впирається в 40 px", () => {
    const d = diePx(1, 1, 2560, 1300);

    expect(d).toBeGreaterThan(70);
    expect(badgeFontPx(d)).toBe(40);
  });
});
