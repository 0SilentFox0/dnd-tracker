import { describe, expect, it } from "vitest";

import { dot, getPolyhedron, len } from "@/lib/utils/battle/fx/dice";
import type { DieSides } from "@/types/battle";

const ALL: DieSides[] = [4, 6, 8, 10, 12, 20];

describe.each(ALL)("d%s polyhedron", (sides) => {
  const poly = getPolyhedron(sides);

  it("has one face per side, each value once", () => {
    expect(poly.faces).toHaveLength(sides);
    expect(poly.faces.map((f) => f.value)).toEqual(Array.from({ length: sides }, (_, i) => i + 1));
  });

  it("has unit, outward normals and unit up vectors lying in the face plane", () => {
    for (const f of poly.faces) {
      expect(len(f.normal)).toBeCloseTo(1, 6);
      expect(dot(f.normal, f.center)).toBeGreaterThan(0.1);
      expect(len(f.up)).toBeCloseTo(1, 6);
      expect(dot(f.up, f.normal)).toBeCloseTo(0, 6);

      for (const m of f.loop) expect(dot(f.normal, poly.vertices[m])).toBeCloseTo(dot(f.normal, f.center), 6);
    }
  });

  it("sums opposite faces to sides + 1 where faces are opposite", () => {
    if (sides === 4) return;

    for (const f of poly.faces) {
      const opposite = poly.faces.find((o) => dot(o.normal, f.normal) < -0.99);

      expect(opposite).toBeDefined();
      expect(f.value + (opposite?.value ?? 0)).toBe(sides + 1);
    }
  });
});
