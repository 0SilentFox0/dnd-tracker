// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolvePoints } from "@/components/battle/fx/runtime/anchors";
import type { FxSpec } from "@/lib/utils/battle/fx";

const spec = (over: Partial<FxSpec> = {}): FxSpec => ({ key: "k", archetype: "bolt", element: "fire", actorId: "a", actorSide: "ally", targetIds: ["t"], hit: true, critical: false, ...over });

function anchor(id: string, rect: { x: number; y: number; w: number; h: number }, track = false) {
  const el = document.createElement("span");

  el.dataset.fxParticipant = id;

  if (track) el.dataset.fxAnchor = "track";

  el.getBoundingClientRect = () => ({ left: rect.x, top: rect.y, width: rect.w, height: rect.h, right: rect.x + rect.w, bottom: rect.y + rect.h, x: rect.x, y: rect.y, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(el);

  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  vi.stubGlobal("innerWidth", 1000);
  vi.stubGlobal("innerHeight", 800);
});

describe("resolvePoints", () => {
  it("uses actor and target centres", () => {
    anchor("a", { x: 0, y: 0, w: 40, h: 40 });
    anchor("t", { x: 500, y: 100, w: 40, h: 40 });

    expect(resolvePoints(spec())).toMatchObject({ from: { x: 20, y: 20 }, to: [{ x: 520, y: 120 }] });
  });

  it("no visible target → null", () => {
    anchor("a", { x: 0, y: 0, w: 40, h: 40 });
    anchor("t", { x: 0, y: 0, w: 0, h: 0 });

    expect(resolvePoints(spec())).toBeNull();
  });

  it("hidden enemy actor comes from the top edge", () => {
    anchor("t", { x: 500, y: 600, w: 40, h: 40 });

    expect(resolvePoints(spec({ actorSide: "enemy" }))?.from).toEqual({ x: 520, y: -20 });
  });

  it("prefers a row anchor over the initiative track", () => {
    anchor("t", { x: 10, y: 10, w: 20, h: 20 }, true);
    anchor("t", { x: 500, y: 300, w: 40, h: 40 });
    anchor("a", { x: 0, y: 0, w: 40, h: 40 });

    expect(resolvePoints(spec())?.to).toEqual([{ x: 520, y: 320 }]);
  });

  it("drops targets that are not visible but keeps the rest", () => {
    anchor("a", { x: 0, y: 0, w: 40, h: 40 });
    anchor("t1", { x: 500, y: 100, w: 40, h: 40 });

    expect(resolvePoints(spec({ targetIds: ["t1", "t2"] }))?.to).toEqual([{ x: 520, y: 120 }]);
  });
});
