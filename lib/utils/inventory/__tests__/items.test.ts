import { describe, expect, it } from "vitest";

import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";

describe("normalizeItems", () => {
  it("fills id/quantity/consumable for legacy rows and drops nameless", () => {
    const out = normalizeItems([{ name: "Ключ" }, { name: "Зілля", quantity: 3, consumable: true, id: "x" }, { quantity: 1 }, "junk"]);

    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: "Ключ", quantity: 1, consumable: false });
    expect(out[0].id).toBe("legacy-0");
    expect(out[1]).toEqual({ id: "x", name: "Зілля", quantity: 3, consumable: true });
  });

  it("returns [] for non-arrays", () => {
    expect(normalizeItems(null)).toEqual([]);
  });
});

describe("normalizeStash", () => {
  it("keeps unique non-empty strings", () => {
    expect(normalizeStash(["a", "a", "", 3, "b"])).toEqual(["a", "b"]);
  });
});
