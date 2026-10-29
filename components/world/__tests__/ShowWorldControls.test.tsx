// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShowWorldControls } from "../show/ShowWorldControls";

import { render } from "@/components/world/__tests__/uk-intl";
import { getWorldMap, getWorldMaps } from "@/lib/api/world";
import type { ShowControl } from "@/lib/hooks/show";
import type { ShowState } from "@/types/show";
import type { WorldMapSummary } from "@/types/world";

vi.unmock("next-intl");

vi.mock("@/lib/api/world", () => ({ getWorldMaps: vi.fn(), getWorldMap: vi.fn() }));
vi.mock("@/components/world/show/WorldTravelDialog", () => ({
  WorldTravelDialog: (p: { open: boolean; onMoved(e: unknown): void }) =>
    p.open ? (
      <button type="button" onClick={() => p.onMoved({ kind: "enter", fromMapId: "m1", destMapId: "m2" })}>
        moved
      </button>
    ) : null,
}));
vi.mock("@/components/world/WorldMapLink", () => ({ WorldMapLink: () => <a href="/dm/world">Карта світу</a> }));

afterEach(cleanup);

const summary = (id: string, name: string, parentMapId: string | null = null) => ({ id, name, parentMapId, parentMarkerId: parentMapId ? "k" : null }) as WorldMapSummary;

const maps = [summary("m2", "Печера", "m1"), summary("m1", "Світ")];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getWorldMaps).mockResolvedValue(maps);
  vi.mocked(getWorldMap).mockImplementation(async (_c, id) => ({ map: maps.find((m) => m.id === id), markers: [{ id: "k1", name: "Брама" }], heroes: [] }) as never);
});

const control = (pending = false) => ({ send: vi.fn().mockResolvedValue(true), pending }) as ShowControl & { send: ReturnType<typeof vi.fn> };

const show = (over: Partial<ShowState> = {}) => ({ deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: null, seq: 1, ...over }) as ShowState;

const setup = (s: ShowState | null, c = control()) => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ShowWorldControls campaignId="c1" show={s} control={c} />
    </QueryClientProvider>,
  );

  return c;
};

describe("ShowWorldControls", () => {
  it("«Вивести карту» шле world з кореневою картою", async () => {
    const c = setup(null);

    await screen.findByRole("option", { name: /Печера/ });
    fireEvent.click(screen.getByRole("button", { name: "Вивести карту гравцям" }));

    expect(c.send).toHaveBeenCalledWith({ action: "world", mapId: "m1", focusMarkerId: undefined });
  });

  it("вибір карти з дерева з відступом, вивід саме її", async () => {
    const c = setup(null);

    const option = await screen.findByRole("option", { name: /Печера/ });

    expect(option.textContent?.startsWith(" ")).toBe(true);

    fireEvent.change(screen.getByLabelText("Карта"), { target: { value: "m2" } });
    fireEvent.click(screen.getByRole("button", { name: "Вивести карту гравцям" }));

    expect(c.send).toHaveBeenCalledWith({ action: "world", mapId: "m2", focusMarkerId: undefined });
  });

  it("вибір маркера на показаній карті шле focusMarkerId", async () => {
    const c = setup(show({ world: { mapId: "m1" } }));

    await screen.findByRole("option", { name: "Брама" });
    fireEvent.change(screen.getByLabelText("Фокус на маркері"), { target: { value: "k1" } });

    expect(c.send).toHaveBeenCalledWith({ action: "world", mapId: "m1", focusMarkerId: "k1" });
  });

  it("«До слайдів» шле worldOff і є лише коли карта в показі", async () => {
    const c = setup(show({ world: { mapId: "m1" } }));

    fireEvent.click(await screen.findByRole("button", { name: "До слайдів" }));

    expect(c.send).toHaveBeenCalledWith({ action: "worldOff" });
  });

  it("без карти в показі «До слайдів» нема", async () => {
    setup(show());

    await screen.findByRole("option", { name: /Печера/ });

    expect(screen.queryByRole("button", { name: "До слайдів" })).toBeNull();
  });

  it("кнопки вимкнені під час pending", async () => {
    setup(show({ world: { mapId: "m1" } }), control(true));

    expect((await screen.findByRole("button", { name: "До слайдів" })).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Вивести карту гравцям" }).hasAttribute("disabled")).toBe(true);
  });

  it("без карт у кампанії — лише посилання на редактор", async () => {
    vi.mocked(getWorldMaps).mockResolvedValue([]);
    setup(null);

    expect(await screen.findByText("Карта світу")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Вивести карту гравцям" })).toBeNull();
  });

  it("після «Зайти» при показі на карті-джерелі шле world на карту призначення", async () => {
    const c = setup(show({ world: { mapId: "m1" } }));

    fireEvent.click(await screen.findByRole("button", { name: "Подорож" }));
    fireEvent.click(screen.getByRole("button", { name: "moved" }));

    expect(c.send).toHaveBeenCalledWith({ action: "world", mapId: "m2" });
  });

  it("при показі в слайдах подорож показ не чіпає", async () => {
    const c = setup(show());

    fireEvent.click(await screen.findByRole("button", { name: "Подорож" }));
    fireEvent.click(screen.getByRole("button", { name: "moved" }));

    expect(c.send).not.toHaveBeenCalled();
  });
});
