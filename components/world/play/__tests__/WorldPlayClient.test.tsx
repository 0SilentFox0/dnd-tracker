// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldPlayClient } from "../WorldPlayClient";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import * as api from "@/lib/api/world";
import type { WorldMarker, WorldView } from "@/types/world";

vi.mock("@/lib/api/world");

const pusherSync = vi.fn();

vi.mock("@/lib/hooks/show", async (orig) => ({ ...(await orig<typeof import("@/lib/hooks/show")>()), usePusherShowSync: (...a: unknown[]) => pusherSync(...a) }));

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/campaigns/c1/world" }));

// eslint-disable-next-line @next/next/no-img-element
vi.mock("next/image", () => ({ default: (p: { alt: string }) => <img alt={p.alt} /> }));

const marker = { id: "k1", mapId: "m1", kind: "point", x: 0.4, y: 0.4, polygon: null, name: "Town", icon: null, color: null, dmNote: null, alwaysVisible: true, sortOrder: 0, childMapId: "m2" } as WorldMarker;

const view = (): WorldView => ({
  map: { id: "m1", name: "World", parentMarkerId: null, parentMapId: null, imageUrl: "https://x/w.webp", width: 800, height: 600, fogEnabled: true, revealRadius: 0.05, entryX: 0.5, entryY: 0.5, updatedAt: "" },
  markers: [marker],
  heroes: [{ id: "h1", name: "Aria", avatar: null, mapId: "m1", x: 0.3, y: 0.3, own: true }],
  reveals: [],
  maps: [
    { id: "m1", name: "World", parentMarkerId: null, parentMapId: null, imageUrl: "", width: 1, height: 1 },
    { id: "m2", name: "Cellar", parentMarkerId: "k1", parentMapId: "m1", imageUrl: "", width: 1, height: 1 },
  ],
  notes: [],
  fog: true,
});

const renderClient = (mapId: string | null) =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <WorldPlayClient campaignId="c1" campaignName="Camp" mapId={mapId} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: true, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
  vi.mocked(api.getWorldView).mockResolvedValue(view());
  vi.mocked(api.getTravelLog).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("WorldPlayClient", () => {
  it("shows an empty state when the DM has not prepared a map", () => {
    renderClient(null);

    expect(screen.getByText("ДМ ще не підготував карту")).toBeTruthy();
    expect(api.getWorldView).not.toHaveBeenCalled();
  });

  it("renders the map with my heroes and open places, and opens a place", async () => {
    renderClient("m1");

    expect(await screen.findByRole("button", { name: "Town" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aria", pressed: false })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cellar" }));

    expect(push).toHaveBeenCalledWith("/campaigns/c1/world?map=m2");
  });

  it("subscribes to the show channel so the page updates live", () => {
    renderClient("m1");

    expect(pusherSync).toHaveBeenCalledWith("c1", true);
  });

  it("opens the notes panel for a clicked marker", async () => {
    renderClient("m1");

    const pin = await screen.findByRole("button", { name: "Town" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 320, clientY: 240 });
    fireEvent.pointerUp(pin, { pointerId: 1, clientX: 320, clientY: 240 });

    await waitFor(() => expect(screen.getByLabelText("Нова нотатка")).toBeTruthy());
  });
});
