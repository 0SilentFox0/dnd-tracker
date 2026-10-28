import { describe, expect, it } from "vitest";

import { normalizeItems } from "@/lib/utils/inventory/items";

describe("normalizeItems: artifactId", () => {
  it("keeps a string artifactId, drops junk", () => {
    expect(normalizeItems([{ id: "p", name: "Potion", quantity: 2, consumable: true, artifactId: "a1" }])).toEqual([{ id: "p", name: "Potion", quantity: 2, consumable: true, artifactId: "a1" }]);
    expect(normalizeItems([{ id: "p", name: "Potion", artifactId: 5 }])[0]).not.toHaveProperty("artifactId");
  });

  it("preserves validated scroll and parameter metadata in a stack", () => {
    expect(normalizeItems([{ id: "stack", name: "Scroll", artifactId: "a1", parameter: "fire", spellId: "s1", unknown: "drop" }])).toEqual([{ id: "stack", name: "Scroll", quantity: 1, consumable: false, artifactId: "a1", parameter: "fire", spellId: "s1" }]);
  });
});
