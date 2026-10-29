// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConditionsSection } from "../sections/ConditionsSection";

import "@/components/ui/__tests__/match-media";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const remove = vi.fn();

const hookState = { usage: null as unknown, isPending: false };

vi.mock("@/lib/hooks/campaigns", () => ({
  useRemoveCustomCondition: () => ({ remove, closeUsage: vi.fn(), ...hookState }),
}));

const formOf = (data: Ruleset) => ({ campaignId: "c1", data, set: vi.fn() }) as unknown as RulesFormState;

const withCustom: Ruleset = { ...DEFAULT_RULES, conditions: { ...DEFAULT_RULES.conditions, custom: [{ key: "custom:pacified", name: "Умиротворений", description: "Не воює", markers: ["no_damage_dealt", "no_hostile_spells"] }] } };

afterEach(() => {
  cleanup();
  hookState.usage = null;
  vi.clearAllMocks();
});

describe("ConditionsSection", () => {
  it("без власних станів списку немає", () => {
    render(<ConditionsSection form={formOf(DEFAULT_RULES)} />);

    expect(screen.queryByTestId("custom-conditions")).toBeNull();
  });

  it("показує власні стани кампанії з маркерами", () => {
    render(<ConditionsSection form={formOf(withCustom)} />);

    expect(screen.getByText("Умиротворений")).toBeTruthy();
    expect(screen.getByText("Не воює")).toBeTruthy();
    expect(screen.getByText("не завдає шкоди, без ворожих заклинань")).toBeTruthy();
  });

  it("кнопка видалення викликає remove зі станом", () => {
    render(<ConditionsSection form={formOf(withCustom)} />);

    fireEvent.click(screen.getByTestId("remove-custom:pacified"));

    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ key: "custom:pacified", name: "Умиротворений" }));
  });

  it("діалог показує бої й заклинання з посиланнями", async () => {
    hookState.usage = { battles: [{ id: "b1", name: "Бій", status: "active", participants: ["Орк"] }], spells: [{ id: "s1", name: "Pacify" }], units: [] };

    render(<ConditionsSection form={formOf(withCustom)} />);

    await waitFor(() => expect(screen.getByTestId("condition-usage")).toBeTruthy());

    expect(screen.getByText("Бій").closest("a")?.getAttribute("href")).toBe("/campaigns/c1/battles/b1");
    expect(screen.getByText("Pacify").closest("a")?.getAttribute("href")).toBe("/campaigns/c1/dm/spells/s1");
  });
});
