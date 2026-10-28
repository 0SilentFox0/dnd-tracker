// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MarkerPickerDialog } from "../MarkerPickerDialog";

import { MarkerChip } from "@/components/scenario/MarkerChip";

const world = vi.hoisted(() => ({
  maps: { data: undefined as unknown, isLoading: false },
  map: { data: undefined as unknown, isError: false, isLoading: false },
}));

vi.mock("@/components/ui/responsive-dialog", () => ({ ResponsiveDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/world/WorldMapLink", () => ({ WorldMapLink: () => <a href="/w">Карта світу</a> }));
vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<object>()), useMediaQuery: () => true }));
vi.mock("@/lib/hooks/world", () => ({ useWorldMaps: () => world.maps, useWorldMap: () => world.map }));

const maps = [
  { id: "root", name: "Світ", parentMapId: null },
  { id: "town", name: "Місто", parentMapId: "root" },
];

beforeEach(() => {
  world.maps = { data: maps, isLoading: false };
  world.map = { data: { map: { id: "root" }, markers: [{ id: "m1", name: "Вежа" }, { id: "m2", name: "Ринок" }] }, isError: false, isLoading: false };
});
afterEach(cleanup);

describe("MarkerPickerDialog", () => {
  it("без карт — порожній стан з посиланням на карту світу", () => {
    world.maps = { data: [], isLoading: false };
    render(<MarkerPickerDialog campaignId="c" open onOpenChange={vi.fn()} onPick={vi.fn()} />);

    expect(screen.getByText("Немає карт світу")).toBeTruthy();
    expect(screen.getByText("Карта світу")).toBeTruthy();
  });

  it("шле {mapId, markerId} і закриває діалог", () => {
    const onPick = vi.fn();

    const onOpenChange = vi.fn();

    render(<MarkerPickerDialog campaignId="c" open onOpenChange={onOpenChange} onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: "Світ" }));
    fireEvent.click(screen.getByRole("button", { name: /Ринок/ }));

    expect(onPick).toHaveBeenCalledWith({ mapId: "root", markerId: "m2" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("пошук фільтрує маркери за назвою", () => {
    render(<MarkerPickerDialog campaignId="c" open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Світ" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Пошук місця" }), { target: { value: "рин" } });

    expect(screen.getByRole("button", { name: /Ринок/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Вежа/ })).toBeNull();
  });
});

describe("MarkerChip", () => {
  it("«Місце недоступне», коли карти нема (404)", () => {
    world.map = { data: undefined, isError: true, isLoading: false };
    render(<MarkerChip campaignId="c" marker={{ mapId: "gone", markerId: "m1" }} action={(ok) => <button disabled={!ok}>Показати</button>} />);

    expect(screen.getByText("Місце недоступне")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Показати" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("«Місце недоступне», коли маркер видалено з наявної карти", () => {
    render(<MarkerChip campaignId="c" marker={{ mapId: "root", markerId: "gone" }} />);

    expect(screen.getByText("Місце недоступне")).toBeTruthy();
  });

  it("показує назву маркера", () => {
    render(<MarkerChip campaignId="c" marker={{ mapId: "root", markerId: "m1" }} />);

    expect(screen.getByText("Вежа")).toBeTruthy();
  });
});
