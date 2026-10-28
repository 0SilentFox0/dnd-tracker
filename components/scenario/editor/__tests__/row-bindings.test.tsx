// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RowBindings } from "@/components/scenario/editor/RowBindings";

vi.mock("@/lib/hooks/show", () => ({
  useDeck: (_c: string, id: string | null) => ({ data: id === "d1" ? { id: "d1", title: "Ліс", scenarioPageId: "p1", slides: [{ id: "slide-a", imageUrl: "https://x/a.webp", title: "Галявина" }], updatedAt: "" } : undefined }),
  useDecks: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/battles", () => ({ useBattleBriefs: () => ({ data: [{ id: "b1", name: "Засідка", status: "prepared" }] }) }));

const world = vi.hoisted(() => ({ map: { data: undefined as unknown, isError: false, isLoading: false } }));

vi.mock("@/lib/hooks/world", () => ({ useWorldMap: () => world.map, useWorldMaps: () => ({ data: [], isLoading: false }) }));
vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: (p: { alt: string }) => <img alt={p.alt} /> }));

afterEach(cleanup);

const doc = { type: "doc" as const, content: [] };

describe("RowBindings", () => {
  it("чипи прив'язок і відв'язування", () => {
    const onChange = { slide: vi.fn(), battle: vi.fn(), marker: vi.fn() };

    render(<RowBindings campaignId="c" pageId="p1" row={{ id: "r", story: doc, notes: doc, slide: { deckId: "d1", slideId: "slide-a" }, battleId: "b1" }} onChange={onChange} />);

    expect(screen.getByText("Галявина")).toBeTruthy();
    expect(screen.getByText("Засідка")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Відв'язати слайд" }));
    expect(onChange.slide).toHaveBeenCalledWith(undefined);

    fireEvent.click(screen.getByRole("button", { name: "Відв'язати бій" }));
    expect(onChange.battle).toHaveBeenCalledWith(undefined);
  });

  it("слайд зник — «недоступно»", () => {
    render(<RowBindings campaignId="c" pageId="p1" row={{ id: "r", story: doc, notes: doc, slide: { deckId: "d1", slideId: "slide-gone" } }} onChange={{ slide: vi.fn(), battle: vi.fn(), marker: vi.fn() }} />);

    expect(screen.getByText("Слайд недоступний")).toBeTruthy();
  });

  it("без прив'язок — кнопки «Слайд» і «Бій»", () => {
    render(<RowBindings campaignId="c" pageId="p1" row={{ id: "r", story: doc, notes: doc }} onChange={{ slide: vi.fn(), battle: vi.fn(), marker: vi.fn() }} />);

    expect(screen.getByRole("button", { name: "Прив'язати слайд" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Прив'язати бій" })).toBeTruthy();
  });

  it("чип місця й відв'язка прибирає прив'язку", () => {
    world.map = { data: { map: {}, markers: [{ id: "m1", name: "Вежа" }] }, isError: false, isLoading: false };

    const onChange = { slide: vi.fn(), battle: vi.fn(), marker: vi.fn() };

    render(<RowBindings campaignId="c" pageId="p1" row={{ id: "r", story: doc, notes: doc, marker: { mapId: "w", markerId: "m1" } }} onChange={onChange} />);

    expect(screen.getByText("Вежа")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Відв'язати місце" }));
    expect(onChange.marker).toHaveBeenCalledWith(undefined);
  });
});
