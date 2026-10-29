// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConditionsSection } from "../sections/ConditionsSection";

import type { RulesFormState } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const formOf = (data: Ruleset) => ({ data, set: vi.fn() }) as unknown as RulesFormState;

afterEach(cleanup);

describe("ConditionsSection", () => {
  it("без власних станів списку немає", () => {
    render(<ConditionsSection form={formOf(DEFAULT_RULES)} />);

    expect(screen.queryByTestId("custom-conditions")).toBeNull();
  });

  it("показує власні стани кампанії з маркерами", () => {
    const rules: Ruleset = { ...DEFAULT_RULES, conditions: { ...DEFAULT_RULES.conditions, custom: [{ key: "custom:pacified", name: "Умиротворений", description: "Не воює", markers: ["no_damage_dealt", "no_hostile_spells"] }] } };

    render(<ConditionsSection form={formOf(rules)} />);

    expect(screen.getByText("Умиротворений")).toBeTruthy();
    expect(screen.getByText("Не воює")).toBeTruthy();
    expect(screen.getByText("не завдає шкоди, без ворожих заклинань")).toBeTruthy();
  });
});
