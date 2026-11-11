// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SystemSection } from "../sections/SystemSection";

import "@/components/ui/__tests__/match-media";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const set = vi.fn();

const form = { campaignId: "c1", data: DEFAULT_RULES, set } as unknown as RulesFormState;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SystemSection", () => {
  it("offers the three systems and reports a change", () => {
    render(<SystemSection form={form} locked={false} />);

    const trigger = screen.getByRole("combobox", { name: "rules.system.label" });

    expect(trigger).not.toBeDisabled();

    fireEvent.click(trigger);

    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["gameTerms.ruleSystem.dnd5e", "gameTerms.ruleSystem.homm", "gameTerms.ruleSystem.wfrp"]);

    fireEvent.click(screen.getByRole("option", { name: "gameTerms.ruleSystem.wfrp" }));

    expect(set).toHaveBeenCalledWith("system", { key: "wfrp" });
  });

  it("locked disables the select and shows the hint", () => {
    render(<SystemSection form={form} locked />);

    expect(screen.getByRole("combobox", { name: "rules.system.label" })).toBeDisabled();
    expect(screen.getByText("rules.system.lockedHint")).toBeTruthy();
  });
});
