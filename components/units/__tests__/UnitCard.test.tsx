/**
 * @vitest-environment happy-dom
 */
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { UnitCard } from "@/components/units/list/UnitCard";
import type { Unit } from "@/lib/hooks/units";

const unit = {
  id: "unit-1",
  name: "Гоблін",
  level: 1,
  attacks: [],
} as unknown as Unit;

function render(ui: ReactElement) {
  return rtlRender(
    <QueryClientProvider client={new QueryClient()}>
      <ConfirmProvider>{ui}</ConfirmProvider>
    </QueryClientProvider>,
  );
}

describe("UnitCard delete", () => {
  beforeEach(() => mockMatchMedia(false));
  afterEach(cleanup);

  it("не видаляє юніт, якщо користувач скасував підтвердження", async () => {
    const onDelete = vi.fn();

    render(<UnitCard unit={unit} campaignId="c1" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити юніт Гоблін" }));
    fireEvent.click(await screen.findByRole("button", { name: "Скасувати" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Скасувати" })).toBeNull());
    await new Promise((r) => setTimeout(r, 0));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("видаляє юніт після підтвердження", async () => {
    const onDelete = vi.fn();

    render(<UnitCard unit={unit} campaignId="c1" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити юніт Гоблін" }));
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("unit-1"));
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
