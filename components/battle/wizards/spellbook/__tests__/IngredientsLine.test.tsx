// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { IngredientsLine } from "../IngredientsLine";

import type { IngredientLine } from "@/lib/hooks/battle/useIngredientPlan";

afterEach(cleanup);

const line = (over: Partial<IngredientLine> = {}): IngredientLine => ({ need: "Diamond (≥50 gp, consumed)", missing: "Diamond ×1 (50 gp)", payGp: 0, blocked: false, ...over });

describe("IngredientsLine", () => {
  it("renders nothing without a line", () => {
    const { container } = render(<IngredientsLine line={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the requirement without a shortage", () => {
    render(<IngredientsLine line={line()} />);

    expect(screen.getByText(/battleWizards.spell.ingredients.need/)).toHaveTextContent("Diamond");
    expect(screen.queryByText(/ingredients.missing/)).toBeNull();
    expect(screen.queryByText(/ingredients.autoPay/)).toBeNull();
  });

  it("marks a shortage as destructive", () => {
    render(<IngredientsLine line={line({ blocked: true })} />);

    expect(screen.getByText(/ingredients.missing/)).toHaveClass("text-destructive");
  });

  it("hints the purse payment", () => {
    render(<IngredientsLine line={line({ payGp: 50 })} />);

    expect(screen.getByText(/ingredients.autoPay/)).toHaveTextContent('"gp":50');
  });
});
