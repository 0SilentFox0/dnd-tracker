import { describe, expect, it } from "vitest";

import { bothOnMap } from "../occupancy";

import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";

describe("bothOnMap", () => {
  const a = placed("a", { at: { x: 1, y: 1 } });

  const b = placed("b", { at: { x: 2, y: 2 } });

  it("true only with a map and every participant on it", () => {
    expect(bothOnMap(testMap(), a, b)).toBe(true);
    expect(bothOnMap(null, a, b)).toBe(false);
    expect(bothOnMap(undefined, a)).toBe(false);
    expect(bothOnMap(testMap(), a, placed("c"))).toBe(false);
  });
});
