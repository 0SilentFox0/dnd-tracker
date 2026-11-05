// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { D100RollBody } from "@/components/battle/wizards/attack/D100RollBody";
import type { AttackWizardModel } from "@/components/battle/wizards/attack/shared";
import { render } from "@/lib/i18n/test/render-uk";

vi.unmock("next-intl");

const model = (available: boolean, fortune?: "reroll" | "sl") => {
  const actions = { roll: vi.fn(), aiRoll: vi.fn(), back: vi.fn(), setFortune: vi.fn() };

  const wizard = {
    state: { index: 0, diceSlots: [], strikes: [{ targetId: "t", damage: [] }], ...(fortune && { fortune }) },
    view: { percentile: { target: null, momentum: false }, fortune: { available, left: 2 } },
    actions,
  } as unknown as AttackWizardModel;

  return { wizard, actions };
};

describe("D100RollBody Fortune", () => {
  afterEach(cleanup);

  it("shows the toggle only when Fortune is available", () => {
    render(<D100RollBody wizard={model(false).wizard} />);
    expect(screen.queryByRole("group", { name: "Удача" })).toBeNull();
    cleanup();

    const { wizard, actions } = model(true);

    render(<D100RollBody wizard={wizard} />);
    expect(screen.getByRole("group", { name: "Удача" })).toBeTruthy();
    expect(screen.getByText("Залишилось Удачі: 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Перекинути" }));
    expect(actions.setFortune).toHaveBeenCalledWith("reroll");
  });

  it("manual reroll asks for a second roll before sending both", () => {
    const { wizard, actions } = model(true, "reroll");

    render(<D100RollBody wizard={wizard} />);
    fireEvent.click(screen.getByRole("button", { name: "Ручний" }));
    expect(screen.getByText("Перший кидок")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("1–100"), { target: { value: "73" } });
    fireEvent.click(screen.getByRole("button", { name: "Кинути" }));

    expect(actions.roll).not.toHaveBeenCalled();
    expect(screen.getByText("Другий кидок (перекидання)")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("1–100"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Кинути" }));

    expect(actions.roll).toHaveBeenCalledWith(73, 12);
  });
});
