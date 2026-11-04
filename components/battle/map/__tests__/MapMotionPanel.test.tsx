// @vitest-environment happy-dom
import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BattleMapPanel } from "../BattleMapPanel";

import { TooltipProvider } from "@/components/ui/tooltip";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { render } from "@/lib/i18n/test/render-uk";
import type { BattleMapConfig } from "@/types/battle";

vi.unmock("next-intl");

vi.mock("@/lib/utils/canvas/ticker", () => ({ subscribe: vi.fn(() => vi.fn()) }));

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

class RO {
  constructor(private cb: (entries: { contentRect: { width: number; height: number } }[]) => void) {}
  observe() {
    this.cb([{ contentRect: { width: 800, height: 600 } }]);
  }
  disconnect() {}
  unobserve() {}
}

const base: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

function panel(map: BattleMapConfig = base, isDM = true) {
  vi.stubGlobal("ResizeObserver", RO);

  const scene = fakeScene({ isDM, map });

  const Wrapper = scene.wrapper;

  const view = render(
    <Wrapper>
      <TooltipProvider>
        <BattleMapPanel />
      </TooltipProvider>
    </Wrapper>,
  );

  const mutate = (scene.value.actions.mapMotion as unknown as { mutate: ReturnType<typeof vi.fn> }).mutate;

  fireEvent.click(view.getByRole("button", { name: "Рух" }));

  return { ...view, mutate };
}

const moving: BattleMapConfig = { ...base, motion: { axis: "x", speed: 2.5 } };

describe("MapMotionPanel", () => {
  it("is hidden from players", () => {
    vi.stubGlobal("ResizeObserver", RO);

    const scene = fakeScene({ isDM: false, map: base });

    const Wrapper = scene.wrapper;

    const { queryByRole } = render(
      <Wrapper>
        <TooltipProvider>
          <BattleMapPanel />
        </TooltipProvider>
      </Wrapper>,
    );

    expect(queryByRole("button", { name: "Рух" })).toBeNull();
  });

  it("preset sets speed, axis button sets axis, pause and off call the tool", () => {
    const { getByRole, mutate } = panel(moving);

    fireEvent.click(getByRole("button", { name: "Швидко" }));
    expect(mutate).toHaveBeenLastCalledWith({ motion: { axis: "x", speed: 5 } });

    fireEvent.click(getByRole("button", { name: "Вертикально" }));
    expect(mutate).toHaveBeenLastCalledWith({ motion: { axis: "y", speed: 2.5 } });

    fireEvent.click(getByRole("button", { name: "Зупинити" }));
    expect(mutate).toHaveBeenLastCalledWith({ motion: { axis: "x", speed: 0 } });

    fireEvent.click(getByRole("button", { name: "Вимкнути" }));
    expect(mutate).toHaveBeenLastCalledWith({ motion: null });
  });

  it("marks the matching preset and axis as pressed", () => {
    const { getByRole } = panel(moving);

    expect(getByRole("button", { name: "Середньо" }).getAttribute("aria-pressed")).toBe("true");
    expect(getByRole("button", { name: "Горизонтально" }).getAttribute("aria-pressed")).toBe("true");
    expect(getByRole("button", { name: "Вертикально" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("slider sends the speed once after the debounce, keeping the sign", () => {
    const { getByRole, mutate } = panel({ ...base, motion: { axis: "y", speed: -1 } });

    const slider = getByRole("slider");

    fireEvent.change(slider, { target: { value: "3" } });
    fireEvent.change(slider, { target: { value: "4" } });
    expect(mutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ motion: { axis: "y", speed: -4 } });
  });

  it("when off: presets, reverse and off are disabled, axis enables it", () => {
    const { getByRole, mutate } = panel(base);

    for (const name of ["Повільно", "Розвернути", "Вимкнути"]) {
      expect((getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }

    fireEvent.click(getByRole("button", { name: "Вертикально" }));
    expect(mutate).toHaveBeenCalledWith({ motion: { axis: "y", speed: 2.5 } });
  });

  it("shows the reduced-motion hint when the system asks for it", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));

    const { getByText } = panel(moving);

    expect(getByText(/зменшення руху/i)).toBeTruthy();
  });
});
