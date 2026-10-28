import { describe, expect, it } from "vitest";

import { collectKeysAndStrings, remapIds } from "@/lib/server/templates/remap-ids";

const map = new Map([["cold1", "cnew1"], ["cold2", "cnew2"]]);

describe("remapIds", () => {
  it("replaces exact string values anywhere, keeps others, does not mutate", () => {
    const input = { a: "cold1", b: ["x", "cold2", { c: "cold1 " }], d: { e: { unitId: "cold2", n: 3, t: true, z: null } } };

    const out = remapIds(input, map);

    expect(out).toEqual({ a: "cnew1", b: ["x", "cnew2", { c: "cold1 " }], d: { e: { unitId: "cnew2", n: 3, t: true, z: null } } });
    expect(input.a).toBe("cold1");
  });

  it("does not touch object keys", () => {
    expect(remapIds({ cold1: 1 }, map)).toEqual({ cold1: 1 });
  });
});

describe("collectKeysAndStrings", () => {
  it("collects every string value and object key", () => {
    expect([...collectKeysAndStrings({ a: "x", b: ["y", { c: "z" }], d: 1 })].sort()).toEqual(["a", "b", "c", "d", "x", "y", "z"]);
  });
});
