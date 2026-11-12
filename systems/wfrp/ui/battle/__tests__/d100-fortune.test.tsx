// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { FORTUNE_INPUT } from "../../../rules/percentile/fortune";
import { D100RollBody } from "../D100RollBody";

import type { RollBodyProps } from "@/components/systems/types";
import { render } from "@/lib/i18n/test/render-uk";

vi.unmock("next-intl");

const model = (available: boolean, fortune?: "reroll" | "sl") => {
  const actions = { roll: vi.fn(), aiRoll: vi.fn(), back: vi.fn(), setSystemInput: vi.fn() };

  const wizard = {
    state: { index: 0, diceSlots: [], strikes: [{ targetId: "t", damage: [] }], targetIds: ["t"], ...(fortune && { system: FORTUNE_INPUT.write({ kind: fortune }) }) },
    view: { judged: { target: null, attackerSide: undefined }, attacker: { battleData: { fortune: available ? 2 : 0 } } },
    actions,
  } as unknown as RollBodyProps["wizard"];

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
    expect(actions.setSystemInput).toHaveBeenCalledWith(FORTUNE_INPUT.write({ kind: "reroll" }));
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
