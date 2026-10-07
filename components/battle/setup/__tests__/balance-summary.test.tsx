// @vitest-environment happy-dom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BalanceSummary } from "@/components/battle/setup/BalanceSummary";
import { useFairBalance } from "@/lib/hooks/battles/setup/useFairBalance";
import type { SetupBalanceParticipant, SetupBalanceStats } from "@/lib/utils/battle/balance/setup";

const stats: SetupBalanceStats = {
  characterStats: Object.fromEntries(["h1", "h2", "h3", "h4"].map((id) => [id, { dpr: 14, hp: 60 }])),
  unitStats: {
    goblin: { dpr: 5, hp: 15, kpi: 0.33, name: "Гоблін", level: 1, raceId: null },
    orc: { dpr: 12, hp: 55, kpi: 0.22, name: "Орк", level: 3, raceId: null },
    ogre: { dpr: 20, hp: 110, kpi: 0.18, name: "Огр", level: 4, raceId: null },
  },
};

const heroes: SetupBalanceParticipant[] = ["h1", "h2", "h3", "h4"].map((id) => ({ id, type: "character", side: "ally" }));

const enemies = (orc: number): SetupBalanceParticipant[] => [{ id: "orc", type: "unit", side: "enemy", quantity: orc }];

afterEach(cleanup);

describe("BalanceSummary", () => {
  it("порожній склад: підказка додати учасників", () => {
    render(<BalanceSummary fair={null} />);

    expect(screen.getByText(/Додайте героїв/)).toBeTruthy();
  });

  it("зміна складу перераховує підсумки та підказки", () => {
    const { result, rerender } = renderHook(({ list }) => useFairBalance(list, stats), { initialProps: { list: [...heroes, ...enemies(4)] } });

    const view = render(<BalanceSummary fair={result.current} />);

    expect(screen.getByTestId("balance-verdict").textContent).toContain("рівний бій");
    expect(screen.getByText(/Сила героїв/)).toBeTruthy();

    act(() => rerender({ list: [...heroes, ...enemies(1)] }));
    view.rerender(<BalanceSummary fair={result.current} />);
    expect(screen.getByTestId("balance-verdict").textContent).toMatch(/Слабко: додайте/);

    act(() => rerender({ list: [...heroes, ...enemies(12)] }));
    view.rerender(<BalanceSummary fair={result.current} />);
    expect(screen.getByTestId("balance-verdict").textContent).toMatch(/Забагато: приберіть/);
  });

  it("герої без ворогів: стан «порожньо»", () => {
    const { result } = renderHook(() => useFairBalance(heroes, stats));

    render(<BalanceSummary fair={result.current} />);

    expect(screen.getByText(/Додайте героїв/)).toBeTruthy();
  });
});
