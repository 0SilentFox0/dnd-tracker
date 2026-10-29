// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldEditorContext, type WorldEditorCtx } from "../WorldEditorContext";
import { WorldInspectorBar } from "../WorldInspectorBar";

import { renderWithConfirm } from "@/components/ui/__tests__/uk-intl";
import type { WorldMarker, WorldNote } from "@/types/world";

vi.unmock("next-intl");

vi.mock("@/lib/hooks/world/useWorldMapUpload", () => ({ useWorldMapUpload: () => ({ upload: vi.fn(), discard: vi.fn(), uploading: false }) }));

const update = vi.fn();

const remove = vi.fn();

const mapUpdate = vi.fn();

const setTool = vi.fn();

const marker = (over: Partial<WorldMarker> = {}): WorldMarker => ({
  id: "k1", mapId: "m1", kind: "point", x: 0.5, y: 0.5, polygon: null, name: "Місто", icon: "city", color: null, dmNote: null, alwaysVisible: false, sortOrder: 0, childMapId: null, ...over,
});

const map = { id: "m1", name: "Світ", parentMarkerId: null, parentMapId: null, imageUrl: "u", width: 800, height: 600, fogEnabled: true, revealRadius: 0.05, entryX: 0.5, entryY: 0.5, updatedAt: "" };

const renderBar = ({ m, open = true, onClose = vi.fn(), notes = [] }: { m?: WorldMarker; open?: boolean; onClose?: () => void; notes?: WorldNote[] } = {}) => {
  const ctx = {
    campaignId: "c1",
    detail: { map, markers: m ? [m] : [], notes },
    maps: [map, { ...map, id: "m2", name: "Вкладена", parentMapId: "m1" }],
    selectedId: m?.id ?? null,
    select: vi.fn(),
    openMap: vi.fn(),
    tool: "select",
    setTool,
    redrawId: null,
    redraw: vi.fn(),
    editor: { marker: { update: { mutateOk: update }, remove: { mutateOk: remove } }, map: { update: { mutateOk: mapUpdate }, remove: { mutateOk: vi.fn() }, create: { isPending: false } } },
  } as unknown as WorldEditorCtx;

  renderWithConfirm(
    <WorldEditorContext.Provider value={ctx}>
      <QueryClientProvider client={new QueryClient()}>
        <WorldInspectorBar open={open} onClose={onClose} />
      </QueryClientProvider>
    </WorldEditorContext.Provider>,
  );

  return { ctx, onClose };
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  remove.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("WorldInspectorBar", () => {
  it("shows an idle hint when closed", () => {
    renderBar({ open: false });

    expect(screen.getByText(/Оберіть точку чи зону/)).toBeTruthy();
    expect(screen.queryByLabelText("Назва")).toBeNull();
  });

  it("shows marker fields when a marker is selected", () => {
    renderBar({ m: marker() });

    expect((screen.getByLabelText("Назва") as HTMLInputElement).value).toBe("Місто");
    expect(screen.getByText("Точка")).toBeTruthy();
  });

  it("saves the name on blur and on Enter", () => {
    renderBar({ m: marker() });

    const input = screen.getByLabelText("Назва");

    fireEvent.change(input, { target: { value: "Столиця" } });
    fireEvent.blur(input);

    expect(update).toHaveBeenCalledWith({ id: "k1", data: { name: "Столиця" } });
  });

  it("toggles the known-location switch", () => {
    renderBar({ m: marker() });

    fireEvent.click(screen.getByRole("switch", { name: "Відома локація" }));

    expect(update).toHaveBeenCalledWith({ id: "k1", data: { alwaysVisible: true } });
  });

  it("picks an icon from the popover", async () => {
    renderBar({ m: marker() });

    fireEvent.click(screen.getByRole("button", { name: "Іконка" }));
    fireEvent.click(await screen.findByRole("button", { name: "Замок" }));

    expect(update).toHaveBeenCalledWith({ id: "k1", data: { icon: "castle" } });
  });

  it("shows colour and redraw only for zones", () => {
    renderBar({ m: marker() });

    expect(screen.queryByLabelText("Колір зони")).toBeNull();

    cleanup();
    renderBar({ m: marker({ kind: "zone", polygon: [[0, 0], [1, 0], [1, 1], [0, 0]], icon: null }) });

    expect(screen.getByLabelText("Колір зони")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Перемалювати контур/ })).toBeTruthy();
  });

  it("saves the DM note when the popover closes", async () => {
    renderBar({ m: marker() });

    fireEvent.click(screen.getByRole("button", { name: /Нотатка/ }));
    fireEvent.change(await screen.findByLabelText("Нотатка ДМ"), { target: { value: "секрет" } });
    fireEvent.keyDown(screen.getByLabelText("Нотатка ДМ"), { key: "Escape" });

    await waitFor(() => expect(update).toHaveBeenCalledWith({ id: "k1", data: { dmNote: "секрет" } }));
  });

  it("lets the DM moderate players' notes from the popover", async () => {
    const note: WorldNote = { id: "n1", markerId: "k1", authorUserId: "u", authorName: "Олег", characterId: null, visibility: "public", text: "Бачив дракона", mine: false, createdAt: "", updatedAt: "" };

    renderBar({ m: marker(), notes: [note] });

    fireEvent.click(screen.getByRole("button", { name: /Нотатки гравців/ }));

    expect(await screen.findByText("Бачив дракона")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Видалити нотатку" })).toBeTruthy();
  });

  it("deletes only after confirmation", async () => {
    renderBar({ m: marker({ childMapId: "m2" }) });

    fireEvent.click(screen.getByRole("button", { name: /^Видалити$/ }));
    expect(await screen.findByText(/вкладені карти/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));
    await waitFor(() => expect(screen.queryByText(/вкладені карти/)).toBeNull());

    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^Видалити$/ }));

    const confirmBtn = (await screen.findAllByRole("button", { name: "Видалити" })).at(-1);

    if (confirmBtn) fireEvent.click(confirmBtn);

    await waitFor(() => expect(remove).toHaveBeenCalledWith("k1"));
  });

  it("closes on the button and on Esc", () => {
    const { onClose } = renderBar({ m: marker() });

    fireEvent.click(screen.getByRole("button", { name: "Закрити панель" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows map settings when no marker is selected", () => {
    renderBar();

    expect((screen.getByLabelText("Назва") as HTMLInputElement).value).toBe("Світ");

    fireEvent.click(screen.getByRole("switch", { name: "Туман війни" }));

    expect(mapUpdate).toHaveBeenCalledWith({ id: "m1", data: { fogEnabled: false } });

    fireEvent.click(screen.getByRole("button", { name: /Точка входу/ }));

    expect(setTool).toHaveBeenCalledWith("entry");
    expect(screen.getByRole("button", { name: "Вкладені карти · 1" })).toBeTruthy();
  });
});
