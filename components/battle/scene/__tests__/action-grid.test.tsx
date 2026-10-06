// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionGrid } from "@/components/battle/scene/ActionGrid";

const turn = (skipped: boolean, moraleResult?: "extra" | "skip" | "none") =>
  ({ phase: "acting", actionUsed: false, bonusAvailable: true, skipped, moraleResult, endTurn: vi.fn(), afterAction: vi.fn(), rollMorale: vi.fn(), stay: vi.fn() }) as never;

const props = {
  pending: false,
  labels: { attack: "Рапіра", magic: "книга", bonus: "Друге дихання" },
  available: { magic: true, bonus: true },
  actions: { attack: vi.fn(), magic: vi.fn(), bonus: vi.fn() },
};

describe("ActionGrid", () => {
  afterEach(cleanup);

  it("після паніки дії недоступні, лишається лише «Завершити хід»", () => {
    render(<ActionGrid turn={turn(true)} {...props} />);

    for (const name of [/Атака/, /Магія/, /Бонус/]) expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Завершити хід" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each([
    [undefined, "не потрібна"],
    ["none", "без змін"],
    ["extra", "бойовий дух"],
    ["skip", "паніка"],
  ] as const)("плитка моралі: %s → «%s»", (moraleResult, label) => {
    render(<ActionGrid turn={turn(moraleResult === "skip", moraleResult)} {...props} />);

    expect(within(screen.getByRole("button", { name: /^Мораль/ })).getByText(label)).toBeTruthy();
  });
});
