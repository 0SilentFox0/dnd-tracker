// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TravelLog } from "../TravelLog";

import * as api from "@/lib/api/world";
import type { TravelKind, WorldTravelEntry } from "@/types/world";

vi.mock("@/lib/api/world");

const entry = (id: string, kind: TravelKind): WorldTravelEntry => ({
  id, mapId: "m1", mapName: "Map", heroes: [{ id: "h1", name: "Aria" }], from: null, to: { mapId: "m1", x: 0.5, y: 0.5 }, toMarkerName: null, rest: "none", kind, createdAt: new Date(0).toISOString(),
});

describe("TravelLog", () => {
  afterEach(cleanup);

  it("показує бейдж за kind", async () => {
    vi.mocked(api.getTravelLog).mockResolvedValue([entry("a", "travel"), entry("b", "enter"), entry("c", "exit")]);

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TravelLog campaignId="c1" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Подорож")).toBeTruthy();
    expect(screen.getByText("Зайшли")).toBeTruthy();
    expect(screen.getByText("Вийшли")).toBeTruthy();
  });
});
