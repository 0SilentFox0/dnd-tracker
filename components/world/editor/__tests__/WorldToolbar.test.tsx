// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorldEditorContext } from "../WorldEditorContext";
import { WorldToolbar, WorldToolHint } from "../WorldToolbar";

import { render } from "@/components/ui/__tests__/uk-intl";
import type { WorldEditorCtx } from "@/lib/hooks/world";
import type { useMapDrawing } from "@/lib/hooks/world";

vi.unmock("next-intl");

afterEach(cleanup);

const openMap = vi.fn();

const ctx = (parentMapId: string | null) =>
  ({
    detail: { map: { id: "m2", parentMapId }, markers: [] },
    maps: [{ id: "m1", name: "Ашан" }],
    openMap,
  }) as unknown as WorldEditorCtx;

const drawing = (over: Partial<ReturnType<typeof useMapDrawing>> = {}) => ({ tool: "select", setTool: vi.fn(), draft: [], finish: vi.fn(), undoVertex: vi.fn(), ...over }) as unknown as ReturnType<typeof useMapDrawing>;

const renderBar = (d: ReturnType<typeof useMapDrawing>, parentMapId: string | null = null, onSettings?: () => void, extra?: ReactNode, readOnly = false) =>
  render(
    <WorldEditorContext.Provider value={ctx(parentMapId)}>
      <WorldToolbar drawing={d} readOnly={readOnly} onSettings={onSettings}>
        {extra}
      </WorldToolbar>
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

  it("read-only disables every tool and settings", () => {
    const d = drawing();

    renderBar(d, null, vi.fn(), undefined, true);

    for (const name of ["Вибір", "Точка", "Зона", "Точка входу", "Герої", "Налаштування карти"]) expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
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
    fireEvent.click(screen.getByRole("button", { name: "Налаштування карти" }));

    expect(onSettings).toHaveBeenCalled();
  });

  it("renders extra slot content", () => {
    renderBar(drawing(), null, undefined, <button type="button">Відпочинок</button>);

    expect(screen.getByRole("button", { name: "Відпочинок" })).toBeTruthy();
  });
});

describe("WorldToolHint", () => {
  it("is hidden for select and explains the other tools", () => {
    const { container, rerender } = render(<WorldToolHint tool="select" vertices={0} />);

    expect(container.textContent).toBe("");

    rerender(<WorldToolHint tool="zone" vertices={2} />);

    expect(screen.getByRole("status").textContent).toContain("двічі клікніть");
  });

  it("puts the extras on their own full-width row below lg, inline on lg", () => {
    renderBar(drawing(), null, undefined, <span>eyes</span>);

    const row = screen.getByText("eyes").parentElement as HTMLElement;

    expect(row.getAttribute("data-slot")).toBe("toolbar-extras");
    expect(row.className).toContain("border-t");
    expect(row.className).toContain("lg:border-t-0");
    expect(row.parentElement?.className).toContain("flex-col");
    expect(row.parentElement?.className).toContain("lg:flex-row");
  });
});
