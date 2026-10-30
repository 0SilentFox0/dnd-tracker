import { describe, expect, it } from "vitest";

import { buildIngredientStock } from "@/lib/utils/spells/ingredients/stock";

describe("buildIngredientStock", () => {
  it("returns an empty stock without items and money, or without an inventory", () => {
    const empty = { items: [], purseCp: 0, usedCp: 0 };

    expect(buildIngredientStock({ items: [], gold: 0, silver: 0, copper: 0 })).toEqual(empty);
    expect(buildIngredientStock({ items: null, gold: 0, silver: 0, copper: 0 })).toEqual(empty);
    expect(buildIngredientStock(null)).toEqual(empty);
  });

  it("maps items by alias or name and starts unused", () => {
    const stock = buildIngredientStock({ items: [{ id: "a", name: "Shiny Gem", ingredient: "diamond", worthGp: 50, quantity: 2 }, { id: "b", name: "Black Pearl" }], gold: 1, silver: 0, copper: 5 });

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
    expect(buildIngredientStock({ items: [], gold: 0, silver: 0, copper: 3 })).toEqual({ items: [], purseCp: 3, usedCp: 0 });
  });
});
