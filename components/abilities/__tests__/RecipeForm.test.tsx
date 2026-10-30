// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RecipeForm } from "@/components/abilities/RecipeForm";
import { RECIPES } from "@/lib/utils/abilities/templates";

const recipe = RECIPES.filter((r) => r.params.some((p) => p.kind === "dice"))[0];

const values = Object.fromEntries(recipe.params.map((p) => [p.key, p.default]));

describe("RecipeForm dice input", () => {
  afterEach(cleanup);

  it("links the invalid dice input to its error element", () => {
    render(<RecipeForm recipe={recipe} values={values} onChange={() => {}} issues={["abilities.validation.diceFormat"]} />);

    const input = screen.getByRole("textbox");

    const errors = screen.getByTestId("recipe-errors");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(errors.id);
  });

  it("has no aria-invalid when valid", () => {
    render(<RecipeForm recipe={recipe} values={values} onChange={() => {}} issues={[]} />);

    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBeNull();
  });
});
