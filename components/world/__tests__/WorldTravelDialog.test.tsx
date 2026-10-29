// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldTravelDialog } from "../show/WorldTravelDialog";

import { render } from "@/components/ui/__tests__/uk-intl";
import * as api from "@/lib/api/world";
import type { WorldMapSummary, WorldMarker } from "@/types/world";

vi.unmock("next-intl");

vi.mock("@/lib/api/world");
vi.mock("@/lib/hooks/world/useWorldHeroes", () => ({ useWorldHeroes: () => ({ heroes: [{ id: "h1", name: "Aria", avatar: null }], isPending: false }) }));
vi.mock("@/components/world/WorldMapView", () => ({
  WorldMapView: (p: { detail: { map: { id: string }; markers: { id: string }[] }; handlers: { onMarkerClick(id: string): void } }) => (
    <button type="button" data-testid="map" onClick={() => p.handlers.onMarkerClick("k1")}>
      {p.detail.map.id}
    </button>
  ),
}));

afterEach(cleanup);

const summary = (id: string, parentMapId: string | null): WorldMapSummary => ({ id, name: id, parentMapId, parentMarkerId: parentMapId ? "k1" : null, imageUrl: "", width: 1, height: 1 });

const marker = { id: "k1", mapId: "m1", x: 0.4, y: 0.4, name: "Town", childMapId: "m2" } as WorldMarker;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.getWorldMaps).mockResolvedValue([summary("m1", null), summary("m2", "m1")]);
  vi.mocked(api.getTravelLog).mockResolvedValue([]);
  vi.mocked(api.getWorldMap).mockImplementation(async (_c, id) => ({ map: summary(id, id === "m2" ? "m1" : null), markers: id === "m1" ? [marker] : [], heroes: [] }) as never);
  vi.mocked(api.enterMarker).mockResolvedValue({ ok: true, positions: [{ id: "h1", name: "Aria", avatar: null, mapId: "m2", x: 0.5, y: 0.5, own: false }] });
});

describe("WorldTravelDialog", () => {
  it("«Зайти» повідомляє про переміщення на дочірню карту й відкриває її в діалозі", async () => {
    const onMoved = vi.fn();

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <WorldTravelDialog campaignId="c1" mapId="m1" open onOpenChange={vi.fn()} onMoved={onMoved} />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByTestId("map"));
    fireEvent.click(screen.getByRole("button", { name: "Aria" }));
    fireEvent.click(await screen.findByRole("button", { name: /Зайти/ }));

    await waitFor(() => expect(onMoved).toHaveBeenCalledWith({ kind: "enter", fromMapId: "m1", destMapId: "m2" }));
    await waitFor(() => expect(screen.getByTestId("map").textContent).toBe("m2"));
  });
});
