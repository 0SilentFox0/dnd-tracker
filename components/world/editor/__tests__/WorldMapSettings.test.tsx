// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldEditorContext, type WorldEditorCtx } from "../WorldEditorContext";
import { WorldMapSettings } from "../WorldMapSettings";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

vi.mock("@/lib/hooks/world", () => ({ useWorldMapUpload: () => ({ upload: vi.fn(), uploading: false }) }));

const update = vi.fn();

const remove = vi.fn();

const detail = {
  map: { id: "m1", name: "Світ", parentMarkerId: null, parentMapId: null, imageUrl: "u", width: 800, height: 600, fogEnabled: true, revealRadius: 0.05, entryX: 0.5, entryY: 0.5, updatedAt: "" },
  markers: [],
};

const maps = [
  { id: "m1", name: "Світ", parentMarkerId: null, parentMapId: null, imageUrl: "u", width: 800, height: 600 },
  { id: "m2", name: "Місто", parentMarkerId: "k", parentMapId: "m1", imageUrl: "u", width: 800, height: 600 },
];

const ctx = { campaignId: "c1", detail, maps, selectedId: null, select: vi.fn(), openMap: vi.fn(), tool: "select", setTool: vi.fn(), editor: { map: { update: { mutateOk: update }, remove: { mutateOk: remove } } } } as unknown as WorldEditorCtx;

const renderSettings = () =>
  renderWithConfirm(
    <WorldEditorContext.Provider value={ctx}>
      <WorldMapSettings />
    </WorldEditorContext.Provider>,
  );

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  remove.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("WorldMapSettings", () => {
  it("does not delete when the confirmation is declined", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /Видалити карту/ }));

    await screen.findByText(/1 вкладених/);
    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));

    await waitFor(() => expect(screen.queryByText(/1 вкладених/)).toBeNull());
    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes after confirmation", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /Видалити карту/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith("m1"));
  });

  it("toggling fog saves fogEnabled", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("switch"));

    expect(update).toHaveBeenCalledWith({ id: "m1", data: { fogEnabled: false } });
  });
});
