// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActionGrid } from "@/components/battle/scene/ActionGrid";

const turn = (skipped: boolean) =>
  ({ phase: "acting", actionUsed: false, bonusAvailable: true, skipped, endTurn: vi.fn(), afterAction: vi.fn(), rollMorale: vi.fn(), stay: vi.fn() }) as never;

const props = {
  pending: false,
  labels: { attack: "Рапіра", magic: "книга", bonus: "Друге дихання" },
  available: { magic: true, bonus: true },
  actions: { attack: vi.fn(), magic: vi.fn(), bonus: vi.fn() },
};

describe("ActionGrid", () => {
  it("після паніки дії недоступні, лишається лише «Завершити хід»", () => {
    render(<ActionGrid turn={turn(true)} {...props} />);

    for (const name of [/Атака/, /Магія/, /Бонус/]) expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Завершити хід" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
