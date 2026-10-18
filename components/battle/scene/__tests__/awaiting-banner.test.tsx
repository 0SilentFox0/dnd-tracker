// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AwaitingDmBanner } from "@/components/battle/scene/AwaitingDmBanner";
import { BattleSceneContext, type BattleSceneValue } from "@/lib/hooks/battle";

afterEach(cleanup);

function renderBanner(isDM: boolean, open: boolean) {
  const setOpen = vi.fn();

  render(<BattleSceneContext.Provider value={{ isDM, awaitingDialog: { open, setOpen } } as unknown as BattleSceneValue}><AwaitingDmBanner /></BattleSceneContext.Provider>);

  return setOpen;
}

describe("AwaitingDmBanner", () => {
  it("гравець бачить очікування рішення ДМ", () => {
    renderBanner(false, false);
    expect(screen.getByText("Очікуємо рішення ДМ")).toBeTruthy();
  });

  it("ДМ після закриття діалогу бачить кнопку, що відкриває його знову", () => {
    const setOpen = renderBanner(true, false);

    fireEvent.click(screen.getByRole("button", { name: /Бій чекає вашого рішення/ }));
    expect(setOpen).toHaveBeenCalledWith(true);
  });

  it("поки діалог відкритий, ДМ банера не бачить", () => {
    renderBanner(true, true);
    expect(screen.queryByText(/Бій чекає вашого рішення/)).toBeNull();
  });
});
