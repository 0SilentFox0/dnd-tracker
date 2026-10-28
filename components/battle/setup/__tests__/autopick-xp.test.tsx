// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AutopickCard } from "@/components/battle/setup/AutopickCard";
import type { BalanceSuggestions } from "@/lib/hooks/battles";

afterEach(cleanup);

const suggestions = (enabled: boolean, setDifficulty = vi.fn()): BalanceSuggestions => ({
  isLoading: false,
  suggested: [{ unitId: "wolf", name: "Вовк", quantity: 8, dpr: 3.5, hp: 11, totalDpr: 28, totalHp: 88, xp: 50 }],
  done: true,
  race: "",
  xp: { enabled, edition: "2014", difficulty: "medium" },
  actions: { setRace: vi.fn(), suggest: vi.fn(), apply: vi.fn(), setDifficulty },
});

describe("AutopickCard: XP", () => {
  it("чипи складності редакції; вибір викликає setDifficulty", () => {
    const setDifficulty = vi.fn();

    render(<AutopickCard hasAllies races={[]} balance={suggestions(true, setDifficulty)} />);

    expect(screen.getByRole("button", { name: "Середня" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Смертельна" }));

    expect(setDifficulty).toHaveBeenCalledWith("deadly");
    expect(screen.getByText(/XP 50/)).toBeTruthy();
  });

  it("режим fair — без чипів", () => {
    render(<AutopickCard hasAllies races={[]} balance={suggestions(false)} />);

    expect(screen.queryByRole("button", { name: "Середня" })).toBeNull();
  });
});
