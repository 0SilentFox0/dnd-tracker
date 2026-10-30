// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpellIngredientsSection } from "../sections/SpellIngredientsSection";

import type { RulesFormState } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const formOf = (data: Ruleset) => ({ data, set: vi.fn() }) as unknown as RulesFormState & { set: ReturnType<typeof vi.fn> };

afterEach(cleanup);

describe("SpellIngredientsSection", () => {
  it("the switch writes only the spellIngredients section", () => {
    const form = formOf(DEFAULT_RULES);

    render(<SpellIngredientsSection form={form} />);

    fireEvent.click(screen.getByRole("switch", { name: "rules.sections.spellIngredients.enabled" }));

    expect(form.set).toHaveBeenCalledWith("spellIngredients", { enabled: true, autoPay: true });
  });
});
