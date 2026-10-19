// @vitest-environment happy-dom
import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleFormMap } from "@/components/battle/setup/BattleFormMap";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { useBattleMapEditor } from "@/lib/hooks/battles/setup/useBattleMapEditor";
import { MAX_SIDE, UNIT } from "@/lib/utils/battle/grid";

vi.mock("next/image", () => ({ default: ({ src }: { src: string }) => <i data-bg={src} /> }));
vi.stubGlobal(
  "ResizeObserver",
  class {
    constructor(private cb: (e: { contentRect: { width: number; height: number } }[]) => void) {}
    observe() {
      this.cb([{ contentRect: { width: 800, height: 600 } }]);
    }
    disconnect() {}
    unobserve() {}
  },
);

const seen = vi.hoisted(() => ({ editor: null as unknown as ReturnType<typeof import("@/lib/hooks/battles/setup/useBattleMapEditor").useBattleMapEditor> }));

function Harness() {
  const editor = useBattleMapEditor(null);

  useEffect(() => {
    seen.editor = editor;
  });

  return (
    <ConfirmProvider>
      <BattleFormMap editor={editor} />
    </ConfirmProvider>
  );
}

const cell = (c: HTMLElement, key: string) => c.querySelector(`polygon[data-fx-cell="${key}"]`) as Element;

const CELL_PX = 10;

// сітка в тестах 10 px на клітинку: штрих рахує клітинки з координат вказівника
function press(c: HTMLElement, key: string) {
  const svg = (cell(c, key) as SVGPolygonElement).ownerSVGElement as SVGSVGElement;

  svg.getScreenCTM = () => ({ a: CELL_PX / UNIT, b: 0, c: 0, d: CELL_PX / UNIT, e: 0, f: 0 }) as DOMMatrix;

  const [x, y] = key.split(":").map(Number);

  fireEvent.pointerDown(cell(c, key), { pointerId: 1, isPrimary: true, button: 0, clientX: x * CELL_PX + 5, clientY: y * CELL_PX + 5 });
}

function dragTo(key: string) {
  const [x, y] = key.split(":").map(Number);

  fireEvent.pointerMove(window, { pointerId: 1, clientX: x * CELL_PX + 5, clientY: y * CELL_PX + 5 });
}

const release = () => fireEvent.pointerUp(window, { pointerId: 1 });

const blocked = (c: HTMLElement) => c.querySelectorAll("polygon[data-blocked]");

const enable = () => fireEvent.click(screen.getByRole("switch", { name: "Бій на карті" }));

const typeIn = (label: string, value: string) => {
  const input = screen.getByLabelText(label);

  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

afterEach(cleanup);

describe("BattleFormMap", () => {
  it("off: no preview and value is null", () => {
    const { container } = render(<Harness />);

    expect(container.querySelectorAll("polygon")).toHaveLength(0);
    expect(seen.editor.state.value).toBeNull();
  });

  it("on: preview with 240 cells; top margin 2 blocks 40 without stroke", () => {
    const { container } = render(<Harness />);

    enable();
    expect(container.querySelectorAll("polygon")).toHaveLength(240);

    typeIn("Зверху", "2");
    expect(blocked(container)).toHaveLength(40);
    expect(blocked(container)[0].getAttribute("stroke")).toBe("none");
  });

  it("palette: drag-paints blocked cells, erase clears them", () => {
    const { container } = render(<Harness />);

    enable();
    press(container, "3:3");
    dragTo("4:3");
    release();
    expect(blocked(container)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Неігрова" }));
    press(container, "3:3");
    dragTo("4:3");
    release();
    expect(blocked(container)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Стерти" }));
    press(container, "3:3");
    release();
    expect(blocked(container)).toHaveLength(1);
  });

  it("palette: wall and hazard with label and damage; no barrier option", () => {
    const { container } = render(<Harness />);

    enable();
    expect(screen.queryByRole("button", { name: "Барʼєр" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Непрохідне" }));
    press(container, "1:1");
    release();

    fireEvent.click(screen.getByRole("button", { name: "Небезпека" }));
    fireEvent.change(screen.getByLabelText("Підпис небезпеки"), { target: { value: "Лава" } });
    press(container, "2:1");
    release();

    fireEvent.change(screen.getByLabelText("Шкода (кубики)"), { target: { value: "" } });
    press(container, "3:1");
    release();

    expect(seen.editor.state.map.terrain).toEqual({
      "1:1": { kind: "wall" },
      "2:1": { kind: "hazard", label: "Лава", damage: { dice: "1d6", type: "fire" } },
      "3:1": { kind: "hazard", label: "Лава" },
    });
    expect(container.querySelector('[data-terrain="wall"]')).not.toBeNull();
    expect(container.querySelector('[data-terrain="hazard"]')).not.toBeNull();
  });

  it("margins keep a 2x2 playable area; Однакові copies the first within limits", () => {
    render(<Harness />);
    enable();
    typeIn("Зверху", "99");
    expect(seen.editor.state.margins.top).toBe(10);

    typeIn("Знизу", "5");
    expect(seen.editor.state.margins.bottom).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Однакові" }));
    expect(seen.editor.state.margins).toEqual({ top: 5, right: 5, bottom: 5, left: 5 });
  });

  it("колонки: стерти й набрати 24 — 24 після blur; стерти й blur — попереднє значення; Enter теж записує", () => {
    render(<Harness />);
    enable();

    const cols = screen.getByLabelText("Колонки") as HTMLInputElement;

    fireEvent.change(cols, { target: { value: "" } });
    expect(cols.value).toBe("");
    expect(seen.editor.state.map.cols).toBe(20);

    fireEvent.change(cols, { target: { value: "2" } });
    fireEvent.change(cols, { target: { value: "24" } });
    expect(seen.editor.state.map.cols).toBe(20);
    fireEvent.blur(cols);
    expect(seen.editor.state.map.cols).toBe(24);

    fireEvent.change(cols, { target: { value: "" } });
    fireEvent.blur(cols);
    expect(seen.editor.state.map.cols).toBe(24);
    expect(cols.value).toBe("24");

    fireEvent.change(cols, { target: { value: "999" } });
    fireEvent.keyDown(cols, { key: "Enter" });
    expect(seen.editor.state.map.cols).toBe(MAX_SIDE);
    expect(cols.value).toBe(String(MAX_SIDE));
  });

  it("default background button resets to null", () => {
    render(<Harness />);
    enable();
    fireEvent.click(screen.getByRole("button", { name: "Стандартний фон" }));
    expect(seen.editor.state.map.background).toBeNull();
  });

  it("typed foreign url does not reach next/image; default background shown until saved", () => {
    const { container } = render(<Harness />);

    enable();
    act(() => seen.editor.actions.setBackground("h"));
    expect(container.querySelector("[data-fx-clip] [data-bg]")?.getAttribute("data-bg")).toBe("/battle-maps/nicolas-tomb.webp");

    act(() => seen.editor.actions.setBackground("https://evil.example/a.png"));
    expect(container.querySelector("[data-fx-clip] [data-bg]")?.getAttribute("data-bg")).toBe("/battle-maps/nicolas-tomb.webp");

    act(() => seen.editor.actions.setBackground("data:image/webp;base64,AAAA"));
    expect(container.querySelector("[data-fx-clip] [data-bg]")?.getAttribute("data-bg")).toBe("data:image/webp;base64,AAAA");
  });

  it("blocked cells are tinted in the editor preview", () => {
    const { container } = render(<Harness />);

    enable();
    typeIn("Зверху", "1");
    expect(blocked(container)[0].getAttribute("fill")).not.toBe("transparent");
  });
});
