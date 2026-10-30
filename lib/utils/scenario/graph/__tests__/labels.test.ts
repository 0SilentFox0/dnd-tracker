import { describe, expect, it } from "vitest";

import { pickLabels } from "@/lib/utils/scenario/graph/labels";
import type { PositionedNode } from "@/lib/utils/scenario/graph/layout";

const node = (id: string, x: number, y: number, degree: number): PositionedNode => ({ id, kind: "entity", type: "unit", label: id, degree, missing: false, refId: id, hidden: 0, x, y });

describe("pickLabels", () => {
  it("hides the lower-degree label when two overlap", () => {
    expect(pickLabels([node("aaaa", 0, 0, 5), node("bbbb", 10, 4, 2)], new Set())).toEqual(new Set(["aaaa"]));
  });

  it("keeps distant labels", () => {
    expect(pickLabels([node("aaaa", 0, 0, 5), node("bbbb", 300, 0, 2)], new Set()).size).toBe(2);
  });

  it("forced labels always show and win priority", () => {
    expect(pickLabels([node("aaaa", 0, 0, 5), node("bbbb", 10, 4, 1)], new Set(["bbbb"]))).toEqual(new Set(["bbbb"]));
  });

  it("skips labels under a scene card", () => {
    const scene: PositionedNode = { ...node("s", 0, 0, 1), kind: "scene", pageKind: "scene" };

    expect(pickLabels([scene, node("aaaa", 0, 0, 1)], new Set()).size).toBe(0);
  });
});
