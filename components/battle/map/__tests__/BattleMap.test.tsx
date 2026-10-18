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

  describe("hud placement", () => {
    it("card sits below the token, and flips above at the bottom edge", () => {
      const fx = { id: "fx", name: "fx", type: "buff", duration: 1, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [] } as unknown as ActiveEffect;

      const { container } = render(
        <TooltipProvider>
          <BattleMap map={square} participants={[at("h", 0, 0), at("e", 3, 2)]} view={{ hud: new Map([["e", { exact: true, effects: [fx, fx] }]]) }} />
        </TooltipProvider>,
      );

      const cards = container.querySelectorAll<HTMLElement>("[class*=backdrop-blur]");

      expect(cards[0].style.top).not.toBe("");
      expect(cards[0].style.bottom).toBe("");
      expect(cards[1].style.bottom).not.toBe("");
      expect(cards[1].style.top).toBe("");
    });
  });

  describe("hud sizing", () => {
    it("card width does not exceed footprint width, size-1 card has no name", () => {
      const big = { ...at("g", 0, 0), combatStats: { ...base.combatStats, gridSize: 2 } };

      const { container } = render(<BattleMap map={square} participants={[at("small", 3, 0), big]} />);

      const cardPx = 200;

      const [first, second] = [...container.querySelectorAll<HTMLElement>("[class*=backdrop-blur]")];

      const widths = [parseFloat(first.style.width), parseFloat(second.style.width)];

      expect(Math.max(...widths)).toBeLessThanOrEqual(2 * cardPx * 1.1);
      expect(Math.min(...widths)).toBeLessThanOrEqual(cardPx * 1.1);
      expect(widths.sort()[0]).toBeCloseTo(cardPx);

      const smallCard = [first, second].find((c) => parseFloat(c.style.width) < cardPx * 1.5) as HTMLElement;

      expect(smallCard.textContent).not.toContain("small");
    });
  });

  describe("hud", () => {
    const effect = { id: "e1", name: "Благословення", type: "buff", duration: 2, permanent: false, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [] } as unknown as ActiveEffect;

    const renderHud = (hud: Map<string, { exact: boolean; effects: ActiveEffect[] }> | undefined) =>
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
      const { container } = renderHud(new Map([["h", { exact: false, effects: [] }]]));

      expect(container.textContent).not.toMatch(/\d+\/\d+/);
    });

    it("shows the effect", () => {
      const { getByLabelText, container } = renderHud(new Map([["h", { exact: true, effects: [effect] }]]));

      expect(getByLabelText("Благословення")).not.toBeNull();
      expect(container.textContent).not.toContain("Благословення");
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
