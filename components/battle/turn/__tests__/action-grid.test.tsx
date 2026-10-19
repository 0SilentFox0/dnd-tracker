// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionGrid } from "@/components/battle/turn/ActionGrid";

const turn = (skipped: boolean, moraleResult?: "extra" | "skip" | "none") =>
  ({ phase: "acting", moraleResult, status: { actionUsed: false, bonusAvailable: true, skipped }, actions: { endTurn: vi.fn(), afterAction: vi.fn(), rollMorale: vi.fn(), stay: vi.fn() } }) as never;

const props = {
  pending: false,
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

  it("після дії «Магія» лишається доступною, якщо є заклинання за бонусну дію", () => {
    const used = (bonusSpellReady: boolean) => ({ ...(turn(false) as object), status: { actionUsed: true, bonusAvailable: true, skipped: false, bonusSpellReady } }) as never;

    render(<ActionGrid turn={used(true)} {...props} />);
    expect((screen.getByRole("button", { name: /Магія/ }) as HTMLButtonElement).disabled).toBe(false);
    cleanup();

    render(<ActionGrid turn={used(false)} {...props} />);
    expect((screen.getByRole("button", { name: /Магія/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("плитка моралі з'являється лише з результатом і називає його", () => {
    render(<ActionGrid turn={turn(false, "extra")} {...props} />);

    expect((screen.getByRole("button", { name: "Бойовий дух" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /^Атака$/ })).toBeTruthy();
    cleanup();

    render(<ActionGrid turn={turn(true, "skip")} {...props} />);
    expect(screen.getByRole("button", { name: "Паніка" })).toBeTruthy();
    cleanup();

    render(<ActionGrid turn={turn(false)} {...props} />);
    expect(screen.queryByRole("button", { name: /Мораль|Паніка|Бойовий/ })).toBeNull();
  });
});
