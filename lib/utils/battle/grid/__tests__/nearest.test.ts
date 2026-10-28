import { describe, expect, it } from "vitest";

import { nearestTo } from "../nearest";

import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";

describe("nearestTo", () => {
  const from = placed("f", { at: { x: 5, y: 5 } });

  it("найближчий за клітинками", () => {
    expect(nearestTo(from, [placed("far", { at: { x: 9, y: 5 } }), placed("near", { at: { x: 6, y: 6 } })])?.basicInfo.id).toBe("near");
  });

  it("нічия — перший у списку", () => {
    expect(nearestTo(from, [placed("a", { at: { x: 7, y: 5 } }), placed("b", { at: { x: 3, y: 5 } })])?.basicInfo.id).toBe("a");
  });

  it("кандидат поза картою — після тих, що на карті", () => {
    expect(nearestTo(from, [placed("off"), placed("on", { at: { x: 9, y: 9 } })])?.basicInfo.id).toBe("on");
  });

  it("from поза картою — перший кандидат; порожньо — undefined", () => {
    expect(nearestTo(placed("x"), [placed("a", { at: { x: 1, y: 1 } }), placed("b")])?.basicInfo.id).toBe("a");
    expect(nearestTo(from, [])).toBeUndefined();
  });
});
