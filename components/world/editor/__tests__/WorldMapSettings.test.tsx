// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldEditorContext, type WorldEditorCtx } from "../WorldEditorContext";
import { WorldMapSettings } from "../WorldMapSettings";

import { renderWithConfirm } from "@/components/ui/__tests__/uk-intl";

vi.unmock("next-intl");

vi.mock("@/lib/hooks/world/useWorldMapUpload", () => ({ useWorldMapUpload: () => ({ upload: vi.fn(), discard: vi.fn(), uploading: false }) }));

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
  it("lists nested maps with a link to open each", () => {
    renderSettings();

    expect(screen.getByRole("heading", { name: "Вкладені карти · 1" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Місто" }));

    expect(ctx.openMap).toHaveBeenCalledWith("m2");
  });

  it("does not delete when the confirmation is declined", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /Видалити карту/ }));

    await screen.findByText(/1 вкладену карту/);
    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));

    await waitFor(() => expect(screen.queryByText(/1 вкладену карту/)).toBeNull());
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

  it("commits the radius once for pointerup followed by blur", () => {
    renderSettings();

    const slider = screen.getByRole("slider");

    fireEvent.change(slider, { target: { value: "0.1" } });
    fireEvent.pointerUp(slider);
    fireEvent.blur(slider);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ id: "m1", data: { revealRadius: 0.1 } });
  });
});
