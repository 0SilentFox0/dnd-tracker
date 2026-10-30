// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render as rtlRender, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TravelLog } from "../TravelLog";

import { render } from "@/components/ui/__tests__/uk-intl";
import * as api from "@/lib/api/world";
import { IntlWrapper } from "@/lib/i18n/test/intl-wrapper";
import type { TravelKind, WorldTravelEntry } from "@/types/world";

vi.unmock("next-intl");

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

  it("shows the rest badge", async () => {
    vi.mocked(api.getTravelLog).mockResolvedValue([{ ...entry("r", "rest"), rest: "long", toMarkerName: "Town" }]);

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TravelLog campaignId="c1" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Відпочинок")).toBeTruthy();
    expect(screen.getByText("Довгий відпочинок")).toBeTruthy();
    expect(screen.getByText("Aria")).toBeTruthy();
    expect(screen.queryByText("Town")).toBeNull();
    expect(screen.queryByText("Map")).toBeNull();
  });

  it("formats the same instant in the provider time zone", async () => {
    vi.mocked(api.getTravelLog).mockResolvedValue([{ ...entry("z", "travel"), createdAt: "2026-07-01T12:00:00.000Z" }]);

    const hourIn = async (timeZone: string) => {
      rtlRender(
        <IntlWrapper timeZone={timeZone}>
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <TravelLog campaignId="c1" />
          </QueryClientProvider>
        </IntlWrapper>,
      );

      const text = (await screen.findByText(/\d{2}:\d{2}/)).textContent;

      cleanup();

      return text;
    };

    const kyiv = await hourIn("Europe/Kyiv");

    const newYork = await hourIn("America/New_York");

    expect(kyiv).toContain("15:00");
    expect(newYork).toContain("08:00");
  });
});
