// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleMapPanel } from "../BattleMapPanel";

import { TooltipProvider } from "@/components/ui/tooltip";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

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

function panel(isDM: boolean) {
  const scene = fakeScene({ isDM, map: { cols: 10, rows: 5, background: null, opacity: 0.3 } });

  scene.me.battleData.position = { x: 0, y: 0 };
  scene.gob.battleData.position = { x: 5, y: 2 };

  const Wrapper = scene.wrapper;

  return render(
    <Wrapper>
      <TooltipProvider>
        <BattleMapPanel />
      </TooltipProvider>
    </Wrapper>,
  );
}

describe("BattleMapPanel", () => {
  it("ДМ бачить перемикач «Розставити» з видимим активним станом", () => {
    const { getByRole } = panel(true);

    const toggle = getByRole("button", { name: "Розставити" });

    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.className).toContain("border-[var(--gold)]");
  });

  it("гравець не бачить перемикача", () => {
    const { queryByRole } = panel(false);

    expect(queryByRole("button", { name: "Розставити" })).toBeNull();
  });

  it("ДМ відкриває палітру «Місцевість», вона вимикає «Розставити»", () => {
    const { getByRole, queryByRole } = panel(true);

    expect(queryByRole("button", { name: "Непрохідне" })).toBeNull();

    fireEvent.click(getByRole("button", { name: "Розставити" }));
    fireEvent.click(getByRole("button", { name: "Місцевість" }));

    expect(getByRole("button", { name: "Місцевість" }).getAttribute("aria-pressed")).toBe("true");
    expect(getByRole("button", { name: "Розставити" }).getAttribute("aria-pressed")).toBe("false");
    expect(getByRole("button", { name: "Непрохідне" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(getByRole("button", { name: "Барʼєр" }));
    expect((getByRole("textbox", { name: "Раундів" }) as HTMLInputElement).value).toBe("1");

    fireEvent.change(getByRole("textbox", { name: "Раундів" }), { target: { value: "35" } });
    expect((getByRole("textbox", { name: "Раундів" }) as HTMLInputElement).value).toBe("20");

    fireEvent.click(getByRole("button", { name: "Небезпека" }));
    expect((getByRole("textbox", { name: "Підпис небезпеки" }) as HTMLInputElement).value).toBe("Небезпечна зона");
  });

  it("гравець не бачить «Місцевість»", () => {
    expect(panel(false).queryByRole("button", { name: "Місцевість" })).toBeNull();
  });
});
