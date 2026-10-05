// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const updateUnit = vi.fn(async () => ({}));

vi.mock("@/lib/api/units", () => ({ updateUnit: (...a: unknown[]) => updateUnit(...(a as [])) }));

import { UnitQuickStatsEditor } from "@/components/units/list/UnitQuickStatsEditor";
import type { Unit } from "@/types/units";

const unit = { id: "u1", armorClass: 14, initiative: 2, attacks: [{ name: "Меч", damageDice: "1d8" }] } as unknown as Unit;

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UnitQuickStatsEditor unit={unit} campaignId="c1" primaryAttackIndex={0} />
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  updateUnit.mockClear();
});

describe("UnitQuickStatsEditor", () => {
  it("bad AC reverts to the saved value without saving", async () => {
    renderIt();

    const ac = screen.getByLabelText("Броня (AC)") as HTMLInputElement;

    fireEvent.change(ac, { target: { value: "" } });
    fireEvent.blur(ac);

    await waitFor(() => expect((screen.getByLabelText("Броня (AC)") as HTMLInputElement).value).toBe("14"));
    expect(updateUnit).not.toHaveBeenCalled();
  });

  it("Enter on a new initiative saves it", async () => {
    renderIt();

    const init = screen.getByLabelText(/Ініціатива/) as HTMLInputElement;

    fireEvent.change(init, { target: { value: "5" } });
    fireEvent.keyDown(init, { key: "Enter" });

    await waitFor(() => expect(updateUnit).toHaveBeenCalledWith("c1", "u1", { initiative: 5 }));
  });
});
