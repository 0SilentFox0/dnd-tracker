// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IngredientsLine } from "../IngredientsLine";

import type { IngredientLine } from "@/lib/hooks/battle/useIngredientPlan";

afterEach(cleanup);

const line = (over: Partial<IngredientLine> = {}): IngredientLine => ({ need: "Diamond", missing: "Diamond ×1", payGp: 0, blocked: false, optional: true, use: false, ...over });

describe("IngredientsLine, optional ingredient", () => {
  it("offers a toggle that reports the choice", () => {
    const onUse = vi.fn();

    render(<IngredientsLine line={line()} onUse={onUse} />);

    fireEvent.click(screen.getByLabelText("battleWizards.spell.ingredients.use"));

    expect(onUse).toHaveBeenCalledWith(true);
  });

  it("shows the shortage only once the ingredient is chosen", () => {
    render(<IngredientsLine line={line({ blocked: true, use: true })} />);

    expect(screen.getByText(/ingredients.missing/)).toBeTruthy();
  });

  it("has no toggle in required mode", () => {
    render(<IngredientsLine line={line({ optional: false })} />);

    expect(screen.queryByLabelText("battleWizards.spell.ingredients.use")).toBeNull();
  });
});
