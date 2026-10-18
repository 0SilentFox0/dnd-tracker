// @vitest-environment happy-dom
import { useEffect } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleFormMap } from "@/components/battle/setup/BattleFormMap";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { useBattleMapEditor } from "@/lib/hooks/battles/setup/useBattleMapEditor";

vi.mock("next/image", () => ({ default: () => null }));
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

  it("paint mode toggles a cell on click and back", () => {
    const { container } = render(<Harness />);

    enable();
    fireEvent.click(cell(container, "3:3"));
    expect(blocked(container)).toHaveLength(0);

    fireEvent.click(screen.getByRole("switch", { name: "Малювати неігрові клітинки" }));
    fireEvent.click(cell(container, "3:3"));
    expect(blocked(container)).toHaveLength(1);

    fireEvent.click(cell(container, "3:3"));
    expect(blocked(container)).toHaveLength(0);
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
});
