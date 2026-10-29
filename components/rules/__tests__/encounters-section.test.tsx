// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EncountersSection } from "../sections/EncountersSection";

import type { RulesFormState } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const formOf = (data: Ruleset) => ({ data, set: vi.fn() }) as unknown as RulesFormState & { set: ReturnType<typeof vi.fn> };

afterEach(cleanup);

describe("EncountersSection", () => {
  it("перемикач бюджету XP пише лише секцію encounters", () => {
    const form = formOf(DEFAULT_RULES);

    render(<EncountersSection form={form} />);

    fireEvent.click(screen.getByRole("switch", { name: "rules.sections.encounters.balance" }));

    expect(form.set).toHaveBeenCalledWith("encounters", { balance: "xp", edition: "2014", autoXp: false });
  });

  it("авто-досвід без досвіду 5e показує підказку", () => {
    render(<EncountersSection form={formOf({ ...DEFAULT_RULES, encounters: { ...DEFAULT_RULES.encounters, autoXp: true } })} />);

    expect(screen.getByText("rules.sections.encounters.autoXpHint")).toBeTruthy();
  });
});
