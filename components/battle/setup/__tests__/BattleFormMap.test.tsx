// @vitest-environment happy-dom
import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleFormMap } from "@/components/battle/setup/BattleFormMap";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { useBattleMapEditor } from "@/lib/hooks/battles/setup/useBattleMapEditor";

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

const blocked = (c: HTMLElement) => c.querySelectorAll("polygon[data-blocked]");

const enable = () => fireEvent.click(screen.getByRole("switch", { name: "Бій на карті" }));

afterEach(cleanup);

describe("BattleFormMap", () => {
  it("off: no preview and value is null", () => {
    const { container } = render(<Harness />);

    expect(container.querySelectorAll("polygon")).toHaveLength(0);
    expect(seen.editor.value).toBeNull();
  });

  it("on: preview with 240 cells; top margin 2 blocks 40 without stroke", () => {
    const { container } = render(<Harness />);

    enable();
    expect(container.querySelectorAll("polygon")).toHaveLength(240);

    fireEvent.change(screen.getByLabelText("Зверху"), { target: { value: "2" } });
    expect(blocked(container)).toHaveLength(40);
    expect(blocked(container)[0].getAttribute("stroke")).toBe("none");
  });

  it("palette: drag-paints blocked cells, erase clears them", () => {
    const { container } = render(<Harness />);

    enable();
    fireEvent.pointerDown(cell(container, "3:3"));
    fireEvent.pointerEnter(cell(container, "4:3"));
    fireEvent.pointerUp(window);
    expect(blocked(container)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Неігрова" }));
    fireEvent.pointerDown(cell(container, "3:3"));
    fireEvent.pointerEnter(cell(container, "4:3"));
    fireEvent.pointerUp(window);
    expect(blocked(container)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Стерти" }));
    fireEvent.pointerDown(container.querySelector('polygon[data-fx-cell="3:3"]') as Element);
    fireEvent.pointerUp(window);
    expect(blocked(container)).toHaveLength(1);
  });

  it("palette: wall and hazard with label; no barrier option", () => {
    const { container } = render(<Harness />);

    enable();
    expect(screen.queryByRole("button", { name: "Барʼєр" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Непрохідне" }));
    fireEvent.pointerDown(cell(container, "1:1"));
    fireEvent.pointerUp(window);

    fireEvent.click(screen.getByRole("button", { name: "Небезпека" }));
    fireEvent.change(screen.getByLabelText("Підпис небезпеки"), { target: { value: "Лава" } });
    fireEvent.pointerDown(cell(container, "2:1"));
    fireEvent.pointerUp(window);

    expect(seen.editor.map.terrain).toEqual({ "1:1": { kind: "wall" }, "2:1": { kind: "hazard", label: "Лава" } });
    expect(container.querySelector('[data-terrain="wall"]')).not.toBeNull();
    expect(container.querySelector('[data-terrain="hazard"]')).not.toBeNull();
  });

  it("margins keep a 2x2 playable area; Однакові copies the first within limits", () => {
    render(<Harness />);
    enable();
    fireEvent.change(screen.getByLabelText("Зверху"), { target: { value: "99" } });
    expect(seen.editor.margins.top).toBe(10);

    fireEvent.change(screen.getByLabelText("Знизу"), { target: { value: "5" } });
    expect(seen.editor.margins.bottom).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Однакові" }));
    expect(seen.editor.margins).toEqual({ top: 5, right: 5, bottom: 5, left: 5 });
  });

  it("default background button resets to null", () => {
    render(<Harness />);
    enable();
    fireEvent.click(screen.getByRole("button", { name: "Стандартний фон" }));
    expect(seen.editor.map.background).toBeNull();
  });

  it("typed foreign url does not reach next/image; default background shown until saved", () => {
    const { container } = render(<Harness />);

    enable();
    act(() => seen.editor.setBackground("h"));
    expect(container.querySelector("[data-fx-clip] [data-bg]")?.getAttribute("data-bg")).toBe("/battle-maps/nicolas-tomb.webp");

    act(() => seen.editor.setBackground("https://evil.example/a.png"));
    expect(container.querySelector("[data-fx-clip] [data-bg]")?.getAttribute("data-bg")).toBe("/battle-maps/nicolas-tomb.webp");

    act(() => seen.editor.setBackground("data:image/webp;base64,AAAA"));
    expect(container.querySelector("[data-fx-clip] [data-bg]")?.getAttribute("data-bg")).toBe("data:image/webp;base64,AAAA");
  });

  it("blocked cells are tinted in the editor preview", () => {
    const { container } = render(<Harness />);

    enable();
    fireEvent.change(screen.getByLabelText("Зверху"), { target: { value: "1" } });
    expect(blocked(container)[0].getAttribute("fill")).not.toBe("transparent");
  });
});
