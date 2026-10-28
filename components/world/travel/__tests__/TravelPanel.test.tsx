// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TravelPanel, type TravelPanelProps } from "../TravelPanel";

import * as api from "@/lib/api/world";
import type { WorldMarker } from "@/types/world";

vi.mock("@/lib/api/world");

const heroes = [
  { id: "h1", name: "Aria", avatar: null },
  { id: "h2", name: "Borin", avatar: null },
];

const marker = (over: Partial<WorldMarker> = {}): WorldMarker => ({
  id: "k1", mapId: "m1", kind: "point", x: 0.4, y: 0.4, polygon: null, name: "Town", icon: null, color: null, dmNote: null, alwaysVisible: false, sortOrder: 0, childMapId: null, ...over,
});

const mapSummary = (id: string, parentMarkerId: string | null) => ({ id, name: id, parentMarkerId, parentMapId: null, imageUrl: "", width: 1, height: 1 });

const renderPanel = (over: Partial<TravelPanelProps> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TravelPanel campaignId="c1" mapId="m1" heroes={heroes} target={{ x: 0.3, y: 0.6 }} selectedMarker={null} onPickTarget={vi.fn()} {...over} />
    </QueryClientProvider>,
  );

const move = () => screen.getByRole("button", { name: /Перемістити/ }) as HTMLButtonElement;

beforeEach(() => {
  vi.mocked(api.getTravelLog).mockResolvedValue([]);
  vi.mocked(api.getWorldMaps).mockResolvedValue([mapSummary("m1", null)]);
  vi.mocked(api.travelHeroes).mockResolvedValue({ ok: true, positions: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TravelPanel", () => {
  it("moves the selected heroes to the target with the chosen rest", async () => {
    renderPanel({ selectedMarker: marker() });
    fireEvent.click(screen.getByRole("button", { name: "Aria" }));
    fireEvent.click(screen.getByLabelText("Довгий"));
    fireEvent.click(move());

    await waitFor(() => expect(api.travelHeroes).toHaveBeenCalledWith("c1", { mapId: "m1", characterIds: ["h1"], to: { x: 0.3, y: 0.6 }, toMarkerId: "k1", rest: "long" }));
  });

  it("selects every hero with the All chip", async () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Усі" }));
    fireEvent.click(move());

    await waitFor(() => expect(vi.mocked(api.travelHeroes).mock.calls[0][1].characterIds).toEqual(["h1", "h2"]));
  });

  it("disables Move without heroes or a target", () => {
    renderPanel();

    expect(move().disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Aria" }));

    expect(move().disabled).toBe(false);

    cleanup();
    renderPanel({ target: null });
    fireEvent.click(screen.getByRole("button", { name: "Aria" }));

    expect(move().disabled).toBe(true);
  });

  it("blocks Move while the request is pending", async () => {
    vi.mocked(api.travelHeroes).mockReturnValue(new Promise(() => {}));
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Aria" }));
    fireEvent.click(move());
    fireEvent.click(move());

    await waitFor(() => expect(move().disabled).toBe(true));

    expect(api.travelHeroes).toHaveBeenCalledTimes(1);
  });

  it("shows Enter only for a marker with a nested map", () => {
    renderPanel({ selectedMarker: marker() });

    expect(screen.queryByRole("button", { name: /Зайти/ })).toBeNull();

    cleanup();
    renderPanel({ selectedMarker: marker({ childMapId: "m2" }) });

    expect(screen.getByRole("button", { name: /Зайти/ })).toBeTruthy();
  });

  it("shows Exit only on a nested map", async () => {
    vi.mocked(api.getWorldMaps).mockResolvedValue([mapSummary("m1", "k0")]);
    renderPanel();

    expect(await screen.findByRole("button", { name: /Вийти/ })).toBeTruthy();
  });

  it("lists the journal", async () => {
    vi.mocked(api.getTravelLog).mockResolvedValue([
      { id: "e1", mapId: "m1", mapName: "World", heroes: [{ id: "h1", name: "Aria" }], from: null, to: { mapId: "m1", x: 0, y: 0 }, toMarkerName: "Town", rest: "short", createdAt: "" },
    ]);
    renderPanel();

    expect(await screen.findByText(/Town, короткий відпочинок/)).toBeTruthy();
  });
});
