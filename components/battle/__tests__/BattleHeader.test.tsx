/**
 * @vitest-environment happy-dom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleHeader } from "@/components/battle/BattleHeader";
import type { BattleScene } from "@/types/api";

const battle = {
  id: "b1",
  name: "Бій",
  status: "active",
  currentRound: 1,
  currentTurnIndex: 0,
  initiativeOrder: [],
} as unknown as BattleScene;

function renderHeader(props: { isDM: boolean; canAdvanceTurn: boolean }) {
  render(
    <BattleHeader battle={battle} onNextTurn={vi.fn()} onReset={vi.fn()} {...props} />,
  );
}

describe("BattleHeader next turn", () => {
  afterEach(cleanup);

  it("гравець не бачить «Наступний хід», коли зараз не його хід", () => {
    renderHeader({ isDM: false, canAdvanceTurn: false });

    expect(screen.queryByRole("button", { name: "Наступний хід" })).toBeNull();
  });

  it("гравець бачить «Наступний хід» у свій хід", () => {
    renderHeader({ isDM: false, canAdvanceTurn: true });

    expect(screen.getByRole("button", { name: "Наступний хід" })).toBeInTheDocument();
  });
});
