import { describe, expect, it } from "vitest";

import { ingredientKey, itemIngredientKey, trackedIngredients } from "@/lib/utils/spells/ingredients";

describe("ingredientKey", () => {
  it("slugs names", () => {
    expect(ingredientKey("Diamond Dust")).toBe("diamond-dust");
    expect(ingredientKey("  Pérola  negra! ")).toBe("perola-negra");
  });
});

describe("trackedIngredients", () => {
  it("drops focus items", () => {
    const list = [{ focus: true }, { focus: false }];

    expect(trackedIngredients(list)).toEqual([{ focus: false }]);
  });
});

describe("itemIngredientKey", () => {
  it("prefers the ingredient alias over the name", () => {
    expect(itemIngredientKey({ name: "Shiny Gem", ingredient: "diamond" })).toBe("diamond");
    expect(itemIngredientKey({ name: "Diamond Dust" })).toBe("diamond-dust");
  });
});
