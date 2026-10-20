// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { memo } from "@/components/battle/fx/auras/kit";
import { AuraParticles } from "@/components/battle/fx/auras/particles";
import type { AuraCtx } from "@/components/battle/fx/auras/types";
import { taperedStroke } from "@/components/battle/fx/runtime/shapes";
import { fitCanvas } from "@/lib/utils/canvas/canvas-size";

afterEach(() => vi.unstubAllGlobals());

describe("fitCanvas", () => {
  it("caps the scale at 2× and leaves an already fitting canvas untouched", () => {
    vi.stubGlobal("devicePixelRatio", 3);

    const canvas = document.createElement("canvas");

    expect(fitCanvas(canvas, 100, 50)).toBe(2);
    expect([canvas.width, canvas.height]).toEqual([200, 100]);

    const set = vi.spyOn(canvas, "width", "set");

    fitCanvas(canvas, 100, 50);
    expect(set).not.toHaveBeenCalled();

    fitCanvas(canvas, 120, 50);
    expect(canvas.width).toBe(240);
  });
});

describe("taperedStroke", () => {
  it("strokes the polyline in width bands, thick at the root", () => {
    const widths: number[] = [];

    const g = { strokeStyle: "", lineWidth: 0, beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(() => widths.push(g.lineWidth)) };

    const pts = Array.from({ length: 25 }, (_, i) => ({ x: i, y: 0 }));

    taperedStroke(g as unknown as CanvasRenderingContext2D, pts, "#000", 4, 0.7, 0.5);

    expect(g.stroke).toHaveBeenCalledTimes(6);
    expect(g.lineTo).toHaveBeenCalledTimes(24);
    expect(widths).toEqual([...widths].sort((a, b) => b - a));
    expect(widths[0]).toBeCloseTo(4 * (1 - (2.5 / 25) * 0.7));
  });
});

describe("aura memo", () => {
  it("builds a value once per aura instance", () => {
    const ctx: AuraCtx = { cx: 0, cy: 0, r: 24, s: 1, parts: new AuraParticles(), box: 106, dpr: 2, cache: new Map() };

    const make = vi.fn(() => ({}));

    expect(memo(ctx, "k", make)).toBe(memo(ctx, "k", make));
    expect(make).toHaveBeenCalledTimes(1);
  });
});
