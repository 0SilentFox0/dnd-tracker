// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorldEditorContext, type WorldEditorCtx } from "../WorldEditorContext";
import { WorldToolbar, WorldToolHint } from "../WorldToolbar";

import type { useMapDrawing } from "@/lib/hooks/world";

afterEach(cleanup);

const openMap = vi.fn();

const ctx = (parentMapId: string | null) =>
  ({
    detail: { map: { id: "m2", parentMapId }, markers: [] },
    maps: [{ id: "m1", name: "Ашан" }],
    openMap,
  }) as unknown as WorldEditorCtx;

const drawing = (over: Partial<ReturnType<typeof useMapDrawing>> = {}) => ({ tool: "select", setTool: vi.fn(), draft: [], finish: vi.fn(), undoVertex: vi.fn(), ...over }) as unknown as ReturnType<typeof useMapDrawing>;

const renderBar = (d: ReturnType<typeof useMapDrawing>, parentMapId: string | null = null, onSettings?: () => void) =>
  render(
    <WorldEditorContext.Provider value={ctx(parentMapId)}>
      <WorldToolbar drawing={d} onSettings={onSettings} />
    </WorldEditorContext.Provider>,
  );

describe("WorldToolbar", () => {
  it("shows four tools with the active one pressed and switches on click", () => {
    const d = drawing({ tool: "zone" });

    renderBar(d);

    expect(screen.getByRole("button", { name: "Зона" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Вибір" }).getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Точка входу" }));

    expect(d.setTool).toHaveBeenCalledWith("entry");
  });

  it("offers finishing the zone only with three vertices", () => {
    renderBar(drawing({ tool: "zone", draft: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }));

    expect((screen.getByRole("button", { name: "Замкнути зону" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Крок назад" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("links to the parent map on a nested map", () => {
    renderBar(drawing(), "m1");

    fireEvent.click(screen.getByRole("button", { name: /На батьківську карту/ }));

    expect(openMap).toHaveBeenCalledWith("m1");
  });

  it("has a settings button only when a handler is passed", () => {
    const onSettings = vi.fn();

    renderBar(drawing(), null, onSettings);
    fireEvent.click(screen.getByRole("button", { name: "Налаштування" }));

    expect(onSettings).toHaveBeenCalled();
  });
});

describe("WorldToolHint", () => {
  it("is hidden for select and explains the other tools", () => {
    const { container, rerender } = render(<WorldToolHint tool="select" vertices={0} />);

    expect(container.textContent).toBe("");

    rerender(<WorldToolHint tool="zone" vertices={2} />);

    expect(screen.getByRole("status").textContent).toContain("двічі клікніть");
  });
});
