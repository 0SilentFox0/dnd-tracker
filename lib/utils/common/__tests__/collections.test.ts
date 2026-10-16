import { describe, expect, it } from "vitest";

import { groupBy } from "../collections";

describe("groupBy", () => {
  it("groups by key keeping first-seen key order and item order", () => {
    const result = groupBy(["b1", "a1", "b2", "a2"], (s) => s[0]);

    expect([...result.keys()]).toEqual(["b", "a"]);
    expect(result.get("b")).toEqual(["b1", "b2"]);
    expect(result.get("a")).toEqual(["a1", "a2"]);
  });

  it("returns an empty map for no items", () => {
    expect(groupBy([], (x: number) => x).size).toBe(0);
  });
});
