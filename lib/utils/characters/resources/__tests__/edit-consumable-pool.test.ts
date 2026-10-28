import { describe, expect, it } from "vitest";

import { editResources } from "../edit";

describe("editResources charges", () => {
  it("ignores consumable pool keys, keeps item pools", () => {
    const pools = { "pool:consumable:x": { label: "P", max: 3, rest: null }, "pool:item:w": { label: "W", max: 7, rest: "long" as const } };

    const r = editResources({}, { charges: { "pool:consumable:x": 1, "pool:item:w": 2 } }, undefined, pools);

    expect(Object.keys(r.charges ?? {})).toEqual(["pool:item:w"]);
  });
});
