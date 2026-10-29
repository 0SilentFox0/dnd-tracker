// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBattleTitle } from "../useBattleTitle";

describe("useBattleTitle", () => {
  it("shows the battle name when it is not the user's turn", () => {
    renderHook(() => useBattleTitle("Битва", false));

    expect(document.title).toBe("Битва");
  });

  it("shows the your-turn title on the user's turn and restores the name after", () => {
    const { rerender } = renderHook(({ turn }) => useBattleTitle("Битва", turn), { initialProps: { turn: true } });

    expect(document.title).toContain("yourTurnTitle");

    rerender({ turn: false });

    expect(document.title).toBe("Битва");
  });

  it("keeps the title untouched without a name outside the user's turn", () => {
    document.title = "keep";

    renderHook(() => useBattleTitle(undefined, false));

    expect(document.title).toBe("keep");
  });
});
