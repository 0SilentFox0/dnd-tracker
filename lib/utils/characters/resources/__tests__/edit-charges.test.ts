import { describe, expect, it } from "vitest";

import { editResources } from "@/lib/utils/characters/resources/edit";

const pools = { "pool:item:wand": { label: "Wand", max: 7, rest: "long" as const }, "pool:item:ring": { label: "Ring", max: 3, rest: null } };

describe("editResources: item charges", () => {
  it("sets used with the pool rest, clamps to max, 0 removes, unknown keys ignored", () => {
    expect(editResources({}, { charges: { "pool:item:wand": 2 } }, undefined, pools).charges).toEqual({ "pool:item:wand": { used: 2, rest: "long" } });
    expect(editResources({}, { charges: { "pool:item:ring": 9 } }, undefined, pools).charges).toEqual({ "pool:item:ring": { used: 3, rest: null } });
    expect(editResources({ charges: { "pool:item:wand": { used: 2, rest: "long" } } }, { charges: { "pool:item:wand": 0 } }, undefined, pools)).toEqual({});
    expect(editResources({}, { charges: { "pool:item:gone": 1 } }, undefined, pools)).toEqual({});
  });
});
