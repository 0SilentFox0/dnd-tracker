// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldEditorContext, type WorldEditorCtx } from "../WorldEditorContext";
import { WorldMarkerPanel } from "../WorldMarkerPanel";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { WorldMarker } from "@/types/world";

vi.mock("@/lib/hooks/world", () => ({ useWorldMapUpload: () => ({ upload: vi.fn(), uploading: false }) }));

const update = vi.fn();

const remove = vi.fn();

const marker = (over: Partial<WorldMarker>): WorldMarker => ({
  id: "k1", mapId: "m1", kind: "point", x: 0.5, y: 0.5, polygon: null, name: "Місто", icon: "city", color: null, dmNote: null, alwaysVisible: false, sortOrder: 0, childMapId: null, ...over,
});

const renderPanel = (m: WorldMarker) => {
  const ctx = {
    campaignId: "c1",
    detail: { map: { id: "m1" }, markers: [m] },
    maps: [],
    selectedId: m.id,
    select: vi.fn(),
    openMap: vi.fn(),
    tool: "select",
    setTool: vi.fn(),
    redrawId: null,
    redraw: vi.fn(),
    editor: { marker: { update: { mutateOk: update }, remove: { mutateOk: remove } }, map: { create: { isPending: false } } },
  } as unknown as WorldEditorCtx;

  return renderWithConfirm(
    <WorldEditorContext.Provider value={ctx}>
      <WorldMarkerPanel />
    </WorldEditorContext.Provider>,
  );
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  remove.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorldMarkerPanel", () => {
  it("saves the name on blur", () => {
    renderPanel(marker({}));

    const input = screen.getByLabelText("Назва");

    fireEvent.change(input, { target: { value: "Столиця" } });
    fireEvent.blur(input);

    expect(update).toHaveBeenCalledWith({ id: "k1", data: { name: "Столиця" } });
  });

  it("warns about nested maps and does not delete without confirmation", async () => {
    renderPanel(marker({ childMapId: "m2" }));

    fireEvent.click(screen.getByRole("button", { name: /Видалити/ }));

    expect(await screen.findByText(/вкладені карти/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));
    await waitFor(() => expect(screen.queryByText(/вкладені карти/)).toBeNull());

    expect(remove).not.toHaveBeenCalled();
  });

  it("shows the colour only for zones", () => {
    renderPanel(marker({ kind: "point" }));

    expect(screen.queryByLabelText("Колір зони")).toBeNull();

    cleanup();
    renderPanel(marker({ kind: "zone", polygon: [[0, 0], [1, 0], [1, 1], [0, 0]], icon: null }));

    expect(screen.getByLabelText("Колір зони")).toBeTruthy();
  });

  it("flushes the pending colour save on unmount", () => {
    vi.useFakeTimers();

    const { unmount } = renderPanel(marker({ kind: "zone", polygon: [[0, 0], [1, 0], [1, 1], [0, 0]], icon: null }));

    fireEvent.change(screen.getByLabelText("Колір зони"), { target: { value: "#112233" } });

    expect(update).not.toHaveBeenCalled();

    unmount();

    expect(update).toHaveBeenCalledWith({ id: "k1", data: { color: "#112233" } });

    vi.advanceTimersByTime(1000);

    expect(update).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
