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

  it("draws blocked cells dark, without stroke, and ignores clicks on them", () => {
    const onCellClick = vi.fn();

    const { container } = render(<BattleMap map={{ ...square, blocked: ["1:1"] }} participants={people} actions={{ onCellClick }} />);

    const blocked = container.querySelector('polygon[data-fx-cell="1:1"]') as SVGPolygonElement;

    expect(blocked.getAttribute("stroke")).toBe("none");
    expect(blocked.getAttribute("fill")).toBe("transparent");
    expect(blocked.getAttribute("pointer-events")).toBe("none");

    fireEvent.click(blocked);
    expect(onCellClick).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector('polygon[data-fx-cell="2:1"]') as SVGPolygonElement);
    expect(onCellClick).toHaveBeenCalledTimes(1);
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

      const { container } = render(<BattleMap map={square} participants={[at("h", 0, 0)]} view={{ hud: new Map([["h", { exact: true }]]) }} />);

      expect(container.querySelector('[data-map-hud="h"]')?.textContent).toBe("");
    });
  });

  describe("повернення (удар і повернення)", () => {
    it("кнопка лише в учасника з returnId і викликає onReturn", () => {
      const onReturn = vi.fn();

      const { container } = render(
        <TooltipProvider>
          <BattleMap map={square} participants={[at("h", 1, 1), at("g", 2, 2)]} view={{ returnId: "h" }} actions={{ onReturn }} />
        </TooltipProvider>,
      );

      const buttons = container.querySelectorAll("[data-map-return]");

      expect(buttons).toHaveLength(1);
      expect(container.querySelector('[data-map-hud="h"] [data-map-return]')?.textContent).toBe("Повернутися");

      fireEvent.click(buttons[0]);

      expect(onReturn).toHaveBeenCalledTimes(1);
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
      const { container } = renderHud(new Map([["h", { exact: true }]]));

      const max = base.combatStats.maxHp;

      expect(container.textContent).toContain(`${base.combatStats.currentHp}/${max}`);
    });

    it("missing hud entry hides exact HP", () => {
      const { container } = renderHud(undefined);

      expect(container.textContent).not.toMatch(/\d+\/\d+/);
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

  it("наведення на портрет повідомляє клітинку токена, вихід — null", () => {
    const onCellHover = vi.fn();

    const { container } = render(<BattleMap map={square} participants={people} actions={{ onCellHover }} />);

    const token = container.querySelector('[data-fx-participant="e"]') as Element;

    fireEvent.pointerEnter(token);
    expect(onCellHover).toHaveBeenLastCalledWith({ x: 3, y: 2 });

    fireEvent.pointerLeave(token);
    expect(onCellHover).toHaveBeenLastCalledWith(null);
  });

  it("підказка атаки: курсор-зброя за типом, лінія лише для дальньої", () => {
    const clipOf = (c: HTMLElement) => c.querySelector("[data-fx-clip]") as HTMLElement;

    const ranged = render(<BattleMap map={square} participants={people} view={{ trajectory: { fromId: "h", targetId: "e", to: { x: 3, y: 2 }, kind: "ranged" } }} />);

    expect(ranged.container.querySelector('line[data-map-attack-hint="ranged"]')).not.toBeNull();
    expect(clipOf(ranged.container).dataset.attackCursor).toBe("ranged");
    expect(clipOf(ranged.container).style.getPropertyValue("--attack-cursor")).toContain("data:image/svg+xml");
    cleanup();

    const melee = render(<BattleMap map={square} participants={people} view={{ trajectory: { fromId: "h", targetId: "e", to: { x: 3, y: 2 }, kind: "melee" } }} />);

    expect(clipOf(melee.container).dataset.attackCursor).toBe("melee");
    expect(melee.container.querySelector('line[data-map-attack-hint="ranged"]')).toBeNull();
    cleanup();

    const idle = render(<BattleMap map={square} participants={people} />);

    expect(clipOf(idle.container).dataset.attackCursor).toBeUndefined();
  });

  it("colors marked cells", () => {
    const { container } = render(<BattleMap map={square} participants={people} view={{ marks: new Map([["0:0", "target"]]) }} />);

    expect(container.querySelectorAll("polygon")[0].getAttribute("fill")).toBe("rgba(230,80,60,.35)");
  });

  it("move zone: bright crisp outlines, no cost numbers; danger is red", () => {
    const marks = new Map<string, "move-danger" | number>([
      ["1:0", 2],
      ["2:0", "move-danger"],
    ]);

    const { container } = render(<BattleMap map={square} participants={people} view={{ currentId: "h", marks }} />);

    expect(container.querySelectorAll("text")).toHaveLength(0);

    const ok = container.querySelector('[data-fx-zone="move"]') as SVGElement;

    const bad = container.querySelector('[data-fx-zone="danger"]') as SVGElement;

    expect(ok.getAttribute("stroke")).toBe("#7dff5a");
    expect(ok.getAttribute("vector-effect")).toBe("non-scaling-stroke");
    expect(bad.getAttribute("stroke")).toBe("#ff5a4a");
    expect(container.querySelector('polygon[data-fx-cell="1:0"]')?.getAttribute("fill")).toBe("rgba(70,200,70,.16)");
    expect(container.querySelector('polygon[data-fx-cell="2:0"]')?.getAttribute("fill")).toBe("rgba(220,60,50,.2)");
  });

  it("renders wall, barrier and hazard terrain under the grid", () => {
    const map: BattleMapConfig = {
      ...square,
      terrain: { "1:1": { kind: "wall" }, "2:1": { kind: "barrier", untilRound: 3 }, "3:1": { kind: "hazard", label: "Вогняна стіна" } },
    };

    const { container } = render(<BattleMap map={map} participants={people} />);

    const wall = container.querySelector('[data-terrain="wall"] polygon') as Element;

    const barrier = container.querySelector('[data-terrain="barrier"]') as Element;

    const hazard = container.querySelector('[data-terrain="hazard"] polygon') as Element;

    expect(wall.getAttribute("fill")).toBe("rgba(0,0,0,.6)");
    expect(barrier.querySelectorAll("polygon")[0].getAttribute("fill")).toBe("rgba(0,0,0,.75)");
    expect(barrier.querySelectorAll("polygon")[1].getAttribute("fill")).toContain("url(#");
    expect(hazard.getAttribute("fill")).toBe("rgba(200,40,30,.28)");
    expect(hazard.getAttribute("stroke")).toBe("#ff5a4a");
    expect(container.querySelector('polygon[data-fx-cell="1:1"]')?.getAttribute("stroke")).toBe("none");
    expect(container.querySelector('polygon[data-fx-cell="2:1"] title')?.textContent).toBe("Барʼєр до кінця раунду 3");
    expect(container.querySelector('polygon[data-fx-cell="3:1"] title')?.textContent).toBe("Вогняна стіна");
    expect(container.querySelector('polygon[data-fx-cell="0:1"]')?.getAttribute("stroke")).toBe("rgba(255,255,255,1)");
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

  it("showBlocked tints blocked cells without a stroke; default stays transparent", () => {
    const m = { ...square, blocked: ["1:1"] };

    const shown = render(<BattleMap map={m} participants={[]} editing={{ showBlocked: true }} />);

    const cellEl = shown.container.querySelector('polygon[data-fx-cell="1:1"]') as SVGPolygonElement;

    expect(cellEl.getAttribute("fill")).not.toBe("transparent");
    expect(cellEl.getAttribute("stroke")).toBe("none");
    cleanup();

    const hidden = render(<BattleMap map={m} participants={[]} />);

    expect(hidden.container.querySelector('polygon[data-fx-cell="1:1"]')?.getAttribute("fill")).toBe("transparent");
  });

  it("the mover's own token lets clicks through to its footprint cells while move marks show", () => {
    const big = { ...at("g", 0, 0), combatStats: { ...base.combatStats, gridSize: 2 } };

    const moving = render(<BattleMap map={square} participants={[big]} view={{ currentId: "g", marks: new Map([["1:0", 1]]) }} />);

    expect(moving.container.querySelector('[data-fx-participant="g"]')?.className).toContain("pointer-events-none");
    cleanup();

    const idle = render(<BattleMap map={square} participants={[big]} view={{ currentId: "g" }} />);

    expect(idle.container.querySelector('[data-fx-participant="g"]')?.className).toContain("pointer-events-auto");
  });
});

describe("BattleMap — поворот у портреті", () => {
  const wide: BattleMapConfig = { ...square, cols: 8, rows: 4 };

  const clip = (c: HTMLElement) => c.querySelector("[data-fx-clip]") as HTMLElement;

  it("phone: широка карта у вузькому контейнері лягає вертикально, токени стоять рівно", () => {
    avail = { width: 300, height: 600 };

    const { container } = render(<BattleMap map={wide} participants={people} phone />);

    expect(clip(container).style.width).toBe("300px");
    expect(clip(container).style.height).toBe("600px");

    const layer = container.querySelector("[data-map-rotated]") as HTMLElement;

    expect(layer.style.width).toBe("600px");
    expect(layer.style.height).toBe("300px");
    expect(layer.style.transform).toBe("translateX(300px) rotate(90deg)");
    expect(container.querySelector("[data-map-tokens]")?.className).toContain("*:-rotate-90");
    expect(layer.querySelector('[data-fx-participant="h"]')).not.toBeNull();
  });

  it("без phone (десктоп) карта не повертається", () => {
    avail = { width: 300, height: 600 };

    const { container } = render(<BattleMap map={wide} participants={people} />);

    expect(container.querySelector("[data-map-rotated]")).toBeNull();
    expect(clip(container).style.height).toBe("150px");
  });

  it("phone: рамка — лише ігрові клітинки, карта зсунута на поля", () => {
    avail = { width: 600, height: 300 };

    const blocked = ["0:0", "1:0", "2:0", "3:0", "4:0", "5:0", "6:0", "7:0", "0:1", "0:2", "0:3"];

    const { container } = render(<BattleMap map={{ ...wide, blocked }} participants={people} phone />);

    // 7×3 ігрових → 600/7 px на клітинку, рамка 600×(3·600/7)
    expect(clip(container).style.width).toBe("600px");
    expect(parseFloat(clip(container).style.height)).toBeCloseTo((3 * 600) / 7, 3);

    const cropped = container.querySelector("[data-fx-clip] svg")?.parentElement as HTMLElement;

    expect(parseFloat(cropped.style.left)).toBeCloseTo(-600 / 7, 3);
    expect(parseFloat(cropped.style.top)).toBeCloseTo(-600 / 7, 3);
    expect(parseFloat(cropped.style.width)).toBeCloseTo((8 * 600) / 7, 3);
  });
});

describe("BattleMap — телефон: прокрутка, дотик, колесо", () => {
  const tall: BattleMapConfig = { ...square, cols: 4, rows: 20 };

  const clip = (c: HTMLElement) => c.querySelector("[data-fx-clip]") as HTMLElement;

  const outer = (c: HTMLElement) => clip(c).parentElement as HTMLElement;

  it("карта вміщується — touch-none, обгортка з резервом під смугу прокрутки", () => {
    avail = { width: 400, height: 600 };

    const { container } = render(<BattleMap map={square} participants={people} phone />);

    expect(clip(container).className).toContain("touch-none");
    expect(clip(container).className).not.toContain("touch-pan-y");
    expect(outer(container).className).toContain("overflow-y-auto");
    expect(outer(container).className).toContain("[scrollbar-gutter:stable]");
  });

  it("висока карта прокручується — touch-pan-y; у режимі місцевості — touch-none", () => {
    avail = { width: 300, height: 300 };

    const scrolling = render(<BattleMap map={tall} participants={people} phone />);

    expect(clip(scrolling.container).className).toContain("touch-pan-y");
    cleanup();

    const painting = render(<BattleMap map={tall} participants={people} phone actions={{ onStroke: vi.fn() }} editing={{ strokeTool: true }} />);

    expect(clip(painting.container).className).toContain("touch-none");
  });

  it("висока карта без зуму: колесо гортає, Ctrl/⌘+колесо масштабує", () => {
    avail = { width: 300, height: 300 };

    const { container } = render(<BattleMap map={tall} participants={people} phone />);

    expect(fireEvent.wheel(clip(container), { deltaY: 100 })).toBe(true);

    // happy-dom не переносить ctrlKey з ініціалізатора WheelEvent
    const zoomWheel = new WheelEvent("wheel", { deltaY: -100, cancelable: true, bubbles: true });

    Object.defineProperty(zoomWheel, "ctrlKey", { value: true });

    expect(fireEvent(clip(container), zoomWheel)).toBe(false);
  });

  it("фон просить зображення реальної ширини, а не 100vw", () => {
    avail = { width: 300, height: 300 };

    const { container } = render(<BattleMap map={tall} participants={people} phone />);

    expect(container.querySelector("img")?.getAttribute("sizes")).toBe("300px");
  });

  it("невернутий телефон — токени без контр-повороту", () => {
    avail = { width: 600, height: 400 };

    const { container } = render(<BattleMap map={square} participants={people} phone />);

    expect(container.querySelector("[data-map-rotated]")).toBeNull();
    expect(container.querySelector("[data-map-tokens]")?.className).not.toContain("-rotate-90");
  });

  it("десктоп у портретному контейнері не повертає й не обрізає поля", () => {
    avail = { width: 300, height: 600 };

    const blocked = ["0:0", "1:0", "2:0", "3:0", "0:1", "0:2"];

    const { container } = render(<BattleMap map={{ ...square, blocked }} participants={people} />);

    expect(container.querySelector("[data-map-rotated]")).toBeNull();
    expect(container.querySelector("[data-map-tokens]")?.className).not.toContain("-rotate-90");

    const cropped = container.querySelector("[data-fx-clip] svg")?.parentElement as HTMLElement;

    expect(parseFloat(cropped.style.left)).toBe(0);
    expect(parseFloat(cropped.style.top)).toBe(0);
    expect(parseFloat(cropped.style.width)).toBeCloseTo(parseFloat(clip(container).style.width), 3);
    expect(outer(container).className).not.toContain("overflow-y-auto");
  });

  it("на початку ходу прокручує до поточного токена, якщо він за краєм", () => {
    avail = { width: 300, height: 300 };

    const { container, rerender } = render(<BattleMap map={tall} participants={people} view={{ currentId: "h" }} phone />);

    const box = outer(container);

    Object.defineProperty(box, "clientHeight", { value: 300 });
    Object.defineProperty(box, "scrollHeight", { value: 1500 });
    box.getBoundingClientRect = () => ({ top: 0, bottom: 300, left: 0, right: 300, width: 300, height: 300 }) as DOMRect;
    box.scrollBy = vi.fn() as unknown as typeof box.scrollBy;

    const token = container.querySelector('[data-fx-participant="e"]') as HTMLElement;

    token.getBoundingClientRect = () => ({ top: 800, bottom: 850, left: 10, right: 60, width: 50, height: 50 }) as DOMRect;

    rerender(<BattleMap map={tall} participants={people} view={{ currentId: "e" }} phone />);

    expect(box.scrollBy).toHaveBeenCalledWith({ top: 550, behavior: "smooth" });
  });
});

describe("BattleMap — terrain stroke", () => {
  function setup(props: Partial<Parameters<typeof BattleMap>[0]> = {}) {
    const onStroke = vi.fn();

    const utils = render(<BattleMap map={square} participants={people} actions={{ onStroke }} editing={{ strokeTool: true }} {...props} />);

    const svg = (utils.container.querySelector("polygon") as SVGPolygonElement).ownerSVGElement as SVGSVGElement;

    // 100 px на клітинку: одиниця SVG = 1 px екрана
    svg.getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) as DOMMatrix;

    const cell = (key: string) => utils.container.querySelector(`polygon[data-fx-cell="${key}"]`) as Element;

    const down = (key: string, x: number, y: number, init: Record<string, unknown> = {}) =>
      fireEvent.pointerDown(cell(key), { pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y, ...init });

    const move = (x: number, y: number) => fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y });

    const up = () => fireEvent.pointerUp(window, { pointerId: 1 });

    const committed = () => (onStroke.mock.calls.at(-1)?.[0] as { x: number; y: number }[]).map((p) => `${p.x}:${p.y}`);

    return { ...utils, onStroke, down, move, up, committed };
  }

  it("клацання — одна клітинка; тремтіння до 4 px через межу не додає сусіда", () => {
    const { down, move, up, committed, onStroke } = setup();

    down("0:0", 98, 50);
    move(101, 51);
    up();

    expect(onStroke).toHaveBeenCalledTimes(1);
    expect(committed()).toEqual(["0:0"]);
  });

  it("швидкий протяг заповнює клітинки на лінії між вибірками", () => {
    const { down, move, up, committed, container } = setup();

    down("0:0", 50, 50);
    move(350, 250);

    expect(container.querySelectorAll("[data-stroke]")).toHaveLength(4);

    up();

    expect(committed()).toEqual(["0:0", "1:1", "2:1", "3:2"]);
  });

  it("права кнопка й непервинний вказівник штрих не починають", () => {
    const { down, up, onStroke } = setup();

    down("1:1", 150, 150, { button: 2 });
    up();
    down("1:1", 150, 150, { isPrimary: false });
    up();

    expect(onStroke).not.toHaveBeenCalled();
  });

  it("другий палець скасовує штрих (щипок)", () => {
    const { down, move, up, onStroke, container } = setup();

    down("0:0", 50, 50);
    move(250, 50);
    fireEvent.pointerDown(window, { pointerId: 2, isPrimary: false, clientX: 300, clientY: 200 });

    expect(container.querySelectorAll("[data-stroke]")).toHaveLength(0);

    up();

    expect(onStroke).not.toHaveBeenCalled();
  });

  it("вимкнення інструмента посеред штриха прибирає превʼю", () => {
    const { down, move, rerender, container, onStroke } = setup();

    down("0:0", 50, 50);
    move(250, 50);
    rerender(<BattleMap map={square} participants={people} actions={{ onStroke }} />);
    rerender(<BattleMap map={square} participants={people} actions={{ onStroke }} editing={{ strokeTool: true }} />);

    expect(container.querySelectorAll("[data-stroke]")).toHaveLength(0);
  });

  it("токени притушені лише в режимі інструмента; надіслані клітинки видно до відповіді", () => {
    const { container } = setup({ view: { pendingStroke: new Set(["2:2"]) } });

    expect((container.querySelector("[data-map-tokens]") as HTMLElement).style.opacity).toBe("0.35");
    expect(container.querySelector('[data-stroke-pending="2:2"]')).not.toBeNull();
    cleanup();

    const idle = render(<BattleMap map={square} participants={people} view={{ pendingStroke: new Set(["2:2"]) }} />);

    expect((idle.container.querySelector("[data-map-tokens]") as HTMLElement).style.opacity).toBe("");
    expect(idle.container.querySelector("[data-stroke-pending]")).toBeNull();
  });

  it("місцевість на неігровій клітинці не малюється", () => {
    const { container } = render(<BattleMap map={{ ...square, blocked: ["1:1"], terrain: { "1:1": { kind: "wall" }, "2:1": { kind: "wall" } } }} participants={[]} />);

    expect(container.querySelectorAll("[data-terrain]")).toHaveLength(1);
  });

  it("шар шаблону: клітинки шаблону підсвічені, точка наведення яскравіша", () => {
    const marks = new Map([["1:1", "template" as const], ["2:1", "template" as const]]);

    const { container } = render(<BattleMap map={square} participants={people} view={{ marks, aim: { x: 1, y: 1 } }} />);

    const cells = container.querySelectorAll("[data-template-cell]");

    expect([...cells].map((c) => c.getAttribute("data-template-cell"))).toEqual(["1:1", "2:1"]);
    expect(cells[0].getAttribute("stroke")).toBe("#ffb04a");
    expect(container.querySelector('[data-template-aim="1:1"]')).not.toBeNull();
  });
});
