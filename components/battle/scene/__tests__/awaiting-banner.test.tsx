// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AwaitingDmBanner } from "@/components/battle/scene/AwaitingDmBanner";
import { BattleSceneContext, type BattleSceneValue } from "@/lib/hooks/battle";
import { render } from "@/lib/i18n/test/render-uk";

vi.unmock("next-intl");

afterEach(cleanup);

function renderBanner(isDM: boolean, open: boolean) {
  const setOpen = vi.fn();

  render(<BattleSceneContext.Provider value={{ viewer: { isDM }, dialogs: { awaitingDm: { open, setOpen } } } as unknown as BattleSceneValue}><AwaitingDmBanner /></BattleSceneContext.Provider>);

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

  it("поки діалог відкритий, ДМ бачить неактивний банер", () => {
    renderBanner(true, true);
    expect((screen.getByRole("button", { name: /Бій чекає вашого рішення/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
