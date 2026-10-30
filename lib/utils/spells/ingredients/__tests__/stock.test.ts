import { describe, expect, it } from "vitest";

import { buildIngredientStock } from "@/lib/utils/spells/ingredients/stock";

const withPurse = { withPurse: true };

describe("buildIngredientStock", () => {
  it("returns an empty stock without items and money, or without an inventory", () => {
    const empty = { items: [], purseCp: 0, usedCp: 0 };

    expect(buildIngredientStock({ items: [], gold: 0, silver: 0, copper: 0 }, withPurse)).toEqual(empty);
    expect(buildIngredientStock({ items: null, gold: 0, silver: 0, copper: 0 }, withPurse)).toEqual(empty);
    expect(buildIngredientStock(null, withPurse)).toEqual(empty);
  });

  it("maps items by alias or name and starts unused", () => {
    const stock = buildIngredientStock({ items: [{ id: "a", name: "Shiny Gem", ingredient: "diamond", worthGp: 50, quantity: 2 }, { id: "b", name: "Black Pearl" }], gold: 1, silver: 0, copper: 5 }, withPurse);

    expect(stock).toEqual({
      items: [
        { id: "a", key: "diamond", name: "Shiny Gem", worthGp: 50, qty: 2, used: 0 },
        { id: "b", key: "black-pearl", name: "Black Pearl", worthGp: 0, qty: 1, used: 0 },
      ],
      purseCp: 105,
      usedCp: 0,
    });
  });

  it("returns a stock for money alone", () => {
    expect(buildIngredientStock({ items: [], gold: 0, silver: 0, copper: 3 }, withPurse)).toEqual({ items: [], purseCp: 3, usedCp: 0 });
  });

  it("leaves out artifact-linked items", () => {
    const stock = buildIngredientStock({ items: [{ id: "a", name: "Ruby", artifactId: "art1" }, { id: "b", name: "Ruby" }], gold: 0, silver: 0, copper: 0 }, withPurse);

    expect(stock.items.map((i) => i.id)).toEqual(["b"]);
  });

  it("does not expose the wallet unless the purse is needed", () => {
    expect(buildIngredientStock({ items: [], gold: 5, silver: 5, copper: 5 }, { withPurse: false }).purseCp).toBe(0);
  });
});
