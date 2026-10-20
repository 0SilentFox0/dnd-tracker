import { describe, expect, it } from "vitest";

import { computeRig, dot, getPolyhedron, layoutDice, norm, planThrow, qRotate, sampleThrow, slotPosition, sub, type Vec3 } from "@/lib/utils/battle/fx/dice";
import type { DieSides } from "@/types/battle";

const ALL: DieSides[] = [4, 6, 8, 10, 12, 20];

describe.each(ALL)("d%s", (sides) => {
  const poly = getPolyhedron(sides);

  it("turns every value's face to the camera with the number upright on screen", () => {
    for (const size of [{ width: 400, height: 500 }, { width: 900, height: 500 }]) {
      for (const count of [1, 2, 6]) {
        const { slots } = layoutDice([Array.from({ length: count }, () => ({ sides, value: 1 }))]);

        const rig = computeRig({ cols: count, rows: 1 }, size);

        for (const face of poly.faces) {
          slots.forEach((slot, i) => {
            const end = slotPosition(slot, 1);

            const plan = planThrow(7, i + face.value, face, end, rig);

            const toCam = norm(sub(rig.pos, end));

            const normal = qRotate(plan.qFinal, face.normal);

            const up = qRotate(plan.qFinal, face.up);

            expect(dot(normal, toCam)).toBeGreaterThan(0.99);
            expect(dot(up, rig.up)).toBeGreaterThan(0.9);
            expect(dot(up, rig.right)).toBeCloseTo(0, 1);
          });
        }
      }
    }
  });

  it("ends the scripted throw in the final orientation, at rest", () => {
    const rig = computeRig({ cols: 1, rows: 1 }, { width: 750, height: 500 });

    for (const face of poly.faces) {
      const end: Vec3 = [1, 0, 1];

      const plan = planThrow(3, face.value, face, end, rig);

      const out = sampleThrow(plan, 1);

      expect(dot(qRotate(out.q, face.normal), norm(sub(rig.pos, end)))).toBeGreaterThan(0.99);
      expect(out.height).toBe(0);
    }
  });
});
