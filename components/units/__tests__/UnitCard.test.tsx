/**
 * @vitest-environment happy-dom
 */
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render as rtlRender, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnitCard } from "@/components/units/list/UnitCard";
import type { Unit } from "@/lib/hooks/units";

const unit = {
  id: "unit-1",
  name: "Гоблін",
  level: 1,
  attacks: [],
  specialAbilities: [],
} as unknown as Unit;

function render(ui: ReactElement) {
  return rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

describe("UnitCard delete", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("не видаляє юніт, якщо користувач скасував підтвердження", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));

    const onDelete = vi.fn();

    render(<UnitCard unit={unit} campaignId="c1" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити юніт Гоблін" }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("видаляє юніт після підтвердження", () => {
    vi.stubGlobal("confirm", vi.fn(() => true));

    const onDelete = vi.fn();

    render(<UnitCard unit={unit} campaignId="c1" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити юніт Гоблін" }));

    expect(onDelete).toHaveBeenCalledWith("unit-1");
  });
});

describe("UnitCard вміння", () => {
  afterEach(cleanup);

  it("показує опис умінь", () => {
    render(<UnitCard unit={{ ...unit, abilitySummary: ["Влучання · bleed 1d4/раунд × 2 р."] } as Unit} campaignId="c1" onDelete={vi.fn()} />);

    expect(screen.getByText("Вміння:")).toBeInTheDocument();
    expect(screen.getByText("Влучання · bleed 1d4/раунд × 2 р.")).toBeInTheDocument();
  });
});
