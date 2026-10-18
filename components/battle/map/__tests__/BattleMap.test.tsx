// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleMap } from "@/components/battle/map";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { ActiveEffect, BattleMapConfig, BattleParticipant } from "@/types/battle";

afterEach(() => {
  cleanup();
  avail = { width: 800, height: 600 };
});

let avail = { width: 800, height: 600 };

class RO {
  constructor(private cb: (entries: { contentRect: { width: number; height: number } }[]) => void) {}
  observe() {
    this.cb([{ contentRect: avail }]);
  }
  disconnect() {}
  unobserve() {}
}

vi.stubGlobal("ResizeObserver", RO);

const base = createMockParticipant();

function at(id: string, x: number, y: number): BattleParticipant {
  return { ...base, basicInfo: { ...base.basicInfo, id, name: id, avatar: undefined }, battleData: { ...base.battleData, position: { x, y } } };
}

const square: BattleMapConfig = { cols: 4, rows: 3, background: null, opacity: 0.3 };

const people = [at("h", 0, 0), at("e", 3, 2)];

describe("BattleMap", () => {
  it("renders cells and tokens", () => {
    const { container } = render(<BattleMap map={square} participants={people} />);

    expect(container.querySelectorAll("polygon")).toHaveLength(12);
    expect(container.querySelector('[data-fx-participant="h"]')).not.toBeNull();
    expect(container.querySelector('[data-fx-participant="e"]')).not.toBeNull();
  });

  it("exposes FX hooks: anchor, cell, clip", () => {
    const { container } = render(<BattleMap map={square} participants={people} />);

    expect(container.querySelector('[data-fx-participant="h"]')?.getAttribute("data-fx-anchor")).toBe("map");
    expect(container.querySelector('polygon[data-fx-cell="3:2"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-fx-clip]")).toHaveLength(1);
  });

  it("fits a tall map into the container height", () => {
    avail = { width: 1000, height: 500 };

    const { container } = render(<BattleMap map={{ ...square, cols: 20, rows: 40 }} participants={[]} />);

    const clip = container.querySelector("[data-fx-clip]") as HTMLElement;

    expect(parseFloat(clip.style.height)).toBeLessThanOrEqual(500);
    expect(parseFloat(clip.style.width)).toBeCloseTo(250);
  });

  describe("hud footprint", () => {
    const pct = (v: string) => parseFloat(v);

    function rectOf(el: HTMLElement) {
      return { left: pct(el.style.left), top: pct(el.style.top), right: pct(el.style.left) + pct(el.style.width), bottom: pct(el.style.top) + pct(el.style.height) };
    }

    function footprintRect(x: number, y: number, size: number) {
      return { left: (x / square.cols) * 100, top: (y / square.rows) * 100, right: ((x + size) / square.cols) * 100, bottom: ((y + size) / square.rows) * 100 };
    }

    it.each([
      ["size 1", 3, 2, 1],
      ["size 2", 0, 0, 2],
    ])("%s: token, HUD and portrait stay inside the footprint", (_, x, y, size) => {
      const unit = { ...at("u", x, y), combatStats: { ...base.combatStats, gridSize: size } };

      const { container } = render(
        <TooltipProvider>
          <BattleMap map={square} participants={[unit]} />
        </TooltipProvider>,
      );

      const fp = footprintRect(x, y, size);

      const hud = container.querySelector<HTMLElement>('[data-map-hud="u"]') as HTMLElement;

      const r = rectOf(hud);

      expect(r.left).toBeGreaterThanOrEqual(fp.left);
      expect(r.top).toBeGreaterThanOrEqual(fp.top);
      expect(r.right).toBeLessThanOrEqual(fp.right + 1e-6);
      expect(r.bottom).toBeLessThanOrEqual(fp.bottom + 1e-6);

      const strip = hud.querySelector<HTMLElement>("[data-map-hud-strip]") as HTMLElement;

      expect(strip.className).toContain("bottom-0");
      expect(strip.className).toContain("max-h-full");
      expect(strip.className).toContain("w-[94%]");
      expect(strip.className).not.toContain("top-");

      const portrait = container.querySelector<HTMLElement>('[data-fx-participant="u"]') as HTMLElement;

      expect(pct(portrait.style.width)).toBeLessThanOrEqual(72);
      expect(pct(portrait.style.width)).toBeGreaterThanOrEqual(68);
      expect(portrait.className).toContain("top-0");
    });

    it("size-1 card has no name, size 2 shows it", () => {
      const big = { ...at("g", 0, 0), combatStats: { ...base.combatStats, gridSize: 2 } };

      const { container } = render(<BattleMap map={square} participants={[at("small", 3, 0), big]} />);

      expect(container.querySelector('[data-map-hud="small"]')?.textContent).not.toContain("small");
      expect(container.querySelector('[data-map-hud="g"]')?.textContent).toContain("g");
    });

    it("tiny cells show only the bar", () => {
      avail = { width: 80, height: 60 };

      const { container } = render(<BattleMap map={square} participants={[at("h", 0, 0)]} />);

      expect(container.querySelector('[data-map-hud="h"]')?.textContent).toBe("");
    });
  });

  describe("hud", () => {
    const effect = { id: "e1", name: "Благословення", type: "buff", duration: 2, permanent: false, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [] } as unknown as ActiveEffect;

    const renderHud = (hud: Map<string, { exact: boolean }> | undefined) =>
      render(
        <TooltipProvider>
          <BattleMap map={square} participants={[at("h", 1, 1)]} view={{ hud }} />
        </TooltipProvider>,
      );

    it("exact: HP numbers (size 1)", () => {
      const { container } = renderHud(undefined);

      const max = base.combatStats.maxHp;

      expect(container.textContent).toContain(`${base.combatStats.currentHp}/${max}`);
    });

    it("not exact: no HP numbers", () => {
      const { container } = renderHud(new Map([["h", { exact: false }]]));

      expect(container.textContent).not.toMatch(/\d+\/\d+/);
    });

    it("never renders effect icons, even when the participant has effects", () => {
      const withEffect = { ...at("h", 1, 1), battleData: { ...base.battleData, position: { x: 1, y: 1 }, activeEffects: [effect] } };

      const { queryByLabelText } = render(
        <TooltipProvider>
          <BattleMap map={square} participants={[withEffect]} />
        </TooltipProvider>,
      );

      expect(queryByLabelText("Благословення")).toBeNull();
    });
  });

  it("cell click reports the point", () => {
    const onCellClick = vi.fn();

    const { container } = render(<BattleMap map={square} participants={people} actions={{ onCellClick }} />);

    fireEvent.click(container.querySelectorAll("polygon")[5]);
    expect(onCellClick).toHaveBeenCalledWith({ x: 1, y: 1 });
  });

  it("token click does not click the cell", () => {
    const onCellClick = vi.fn();

    const onTokenClick = vi.fn();

    const { container } = render(<BattleMap map={square} participants={people} actions={{ onCellClick, onTokenClick }} />);

    fireEvent.click(container.querySelector('[data-fx-participant="h"]') as Element);
    expect(onTokenClick).toHaveBeenCalledWith("h");
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("colors marked cells", () => {
    const { container } = render(<BattleMap map={square} participants={people} view={{ marks: new Map([["0:0", "target"]]) }} />);

    expect(container.querySelectorAll("polygon")[0].getAttribute("fill")).toBe("rgba(230,80,60,.35)");
  });

  it("a drag does not produce a click", () => {
    const onCellClick = vi.fn();

    const onTokenClick = vi.fn();

    const { container } = render(<BattleMap map={square} participants={people} actions={{ onCellClick, onTokenClick }} />);

    const root = container.querySelector("[data-fx-clip]") as Element;

    const cell = container.querySelectorAll("polygon")[5];

    fireEvent.pointerDown(root, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(root, { pointerId: 1, clientX: 30, clientY: 10 });
    fireEvent.pointerUp(root, { pointerId: 1, clientX: 30, clientY: 10 });
    fireEvent.click(cell);
    expect(onCellClick).not.toHaveBeenCalled();

    fireEvent.pointerDown(root, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(root, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.click(cell);
    expect(onCellClick).toHaveBeenCalledTimes(1);
  });

  it("wheel is non-passive and prevented", () => {
    const { container } = render(<BattleMap map={square} participants={people} />);

    const notPrevented = fireEvent.wheel(container.querySelector("[data-fx-clip]") as Element, { deltaY: -100 });

    expect(notPrevented).toBe(false);
  });
});
