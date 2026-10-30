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

  it("keeps valid worthGp/ingredient and drops invalid ones", () => {
    const [a, b, c] = normalizeItems([{ name: "Gem", worthGp: 50, ingredient: "diamond" }, { name: "X", worthGp: -1, ingredient: "Bad Slug" }, { name: "Y", worthGp: "5" }]);

    expect(a).toMatchObject({ worthGp: 50, ingredient: "diamond" });
    expect(b).not.toHaveProperty("worthGp");
    expect(b).not.toHaveProperty("ingredient");
    expect(c).not.toHaveProperty("worthGp");
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
