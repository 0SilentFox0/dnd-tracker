// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleMapPanel } from "../BattleMapPanel";

import { TooltipProvider } from "@/components/ui/tooltip";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { BattleMapConfig } from "@/types/battle";

vi.mock("@/components/battle/fx/runtime/ticker", () => ({ subscribe: vi.fn(() => vi.fn()) }));

afterEach(cleanup);

class RO {
  constructor(private cb: (entries: { contentRect: { width: number; height: number } }[]) => void) {}
  observe() {
    this.cb([{ contentRect: { width: 800, height: 600 } }]);
  }
  disconnect() {}
  unobserve() {}
}

vi.stubGlobal("ResizeObserver", RO);

function panel(isDM: boolean, map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 }) {
  const scene = fakeScene({ isDM, map });

  const Wrapper = scene.wrapper;

  const view = render(
    <Wrapper>
      <TooltipProvider>
        <BattleMapPanel />
      </TooltipProvider>
    </Wrapper>,
  );

  return { ...view, mutate: (scene.value.actions.mapWeather as unknown as { mutate: ReturnType<typeof vi.fn> }).mutate };
}

describe("Погода в інструментах карти", () => {
  it("гравець не бачить кнопки «Погода»", () => {
    const { queryByRole } = panel(false);

    expect(queryByRole("button", { name: "Погода" })).toBeNull();
  });

  it("ДМ відкриває палітру: «Ясно» + 7 ефектів, поточний позначено", () => {
    const { getByRole } = panel(true, { cols: 10, rows: 5, background: null, opacity: 0.3, weather: "rain" });

    fireEvent.click(getByRole("button", { name: "Погода" }));

    for (const label of ["Ясно", "Дощ", "Гроза", "Сніг", "Хуртовина", "Туман", "Вогонь", "Гробниця"]) {
      expect(getByRole("button", { name: label })).toBeTruthy();
    }

    const labels = Array.from(getByRole("group", { name: "Погода" }).querySelectorAll("button"), (b) => b.textContent);

    expect(labels.indexOf("Гробниця")).toBe(labels.indexOf("Вогонь") + 1);
    expect(getByRole("button", { name: "Дощ" }).getAttribute("aria-pressed")).toBe("true");
    expect(getByRole("button", { name: "Ясно" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("вибір шле мутацію й закриває палітру; той самий вид — без запиту", () => {
    const { getByRole, queryByRole, mutate } = panel(true, { cols: 10, rows: 5, background: null, opacity: 0.3, weather: "rain" });

    fireEvent.click(getByRole("button", { name: "Погода" }));
    fireEvent.click(getByRole("button", { name: "Сніг" }));

    expect(mutate).toHaveBeenCalledWith({ weather: "snow" });
    expect(queryByRole("group", { name: "Погода" })).toBeNull();

    fireEvent.click(getByRole("button", { name: "Погода" }));
    fireEvent.click(getByRole("button", { name: "Дощ" }));
    expect(mutate).toHaveBeenCalledTimes(1);

    fireEvent.click(getByRole("button", { name: "Погода" }));
    fireEvent.click(getByRole("button", { name: "Ясно" }));
    expect(mutate).toHaveBeenLastCalledWith({ weather: null });
  });
});
