import { describe, expect, it } from "vitest";

import { ingredientKey, trackedIngredients } from "@/lib/utils/spells/ingredients";

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
