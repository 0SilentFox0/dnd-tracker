// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRecipeText } from "../useRecipeText";

import { RECIPES } from "@/lib/utils/abilities/templates";
import { TRAIT_RECIPES } from "@/systems/wfrp/rules/traits/recipes";

describe("useRecipeText", () => {
  it("textKey recipes resolve from their own namespace", () => {
    const { result } = renderHook(() => useRecipeText());

    expect(result.current(TRAIT_RECIPES[0], "label")).toBe("wfrpTraits.recipes.armour.label");
  });

  it("plain recipes resolve from abilityRegistry templates", () => {
    const { result } = renderHook(() => useRecipeText());

    expect(result.current(RECIPES[0], "hint")).toBe(`abilityRegistry.templates.${RECIPES[0].id}.hint`);
  });
});
