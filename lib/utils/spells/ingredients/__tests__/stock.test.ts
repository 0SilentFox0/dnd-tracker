import { describe, expect, it } from "vitest";

import { buildIngredientStock, purseToCp } from "@/lib/utils/spells/ingredients/stock";

describe("purseToCp", () => {
  it("converts coins to copper", () => {
    expect(purseToCp({ gold: 1, silver: 5, copper: 20 })).toBe(170);
  });
});

describe("buildIngredientStock", () => {
  it("is undefined without items and money", () => {
    expect(buildIngredientStock({ items: [], gold: 0, silver: 0, copper: 0 })).toBeUndefined();
    expect(buildIngredientStock({ items: null, gold: 0, silver: 0, copper: 0 })).toBeUndefined();
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
