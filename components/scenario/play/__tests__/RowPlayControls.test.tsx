// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RowPlayControls } from "../RowPlayControls";

import { render } from "@/components/scenario/__tests__/uk-intl";
import type { ScenarioPlay } from "@/lib/hooks/scenario";

vi.unmock("next-intl");

const world = vi.hoisted(() => ({ map: { data: undefined as unknown, isError: false, isLoading: false } }));

vi.mock("@/lib/hooks/world", () => ({ useWorldMap: () => world.map }));
vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: () => null }));

const doc = { type: "doc" as const, content: [] };

const row = { id: "r", story: doc, notes: doc, marker: { mapId: "w", markerId: "m" } };

const play = (show: unknown = null): ScenarioPlay => ({ lookup: { decks: new Map(), battles: new Map(), show }, showMarker: vi.fn(), pending: false } as unknown as ScenarioPlay);

beforeEach(() => {
  world.map = { data: { map: {}, markers: [{ id: "m", name: "Вежа" }] }, isError: false, isLoading: false };
});
afterEach(cleanup);

describe("RowPlayControls — місце", () => {
  it("клік шле showMarker", () => {
    const pl = play();

    render(<RowPlayControls campaignId="c" row={row} play={pl} />);
    fireEvent.click(screen.getByRole("button", { name: "Показати на карті" }));

    expect(pl.showMarker).toHaveBeenCalledWith(row.marker);
  });

  it("на екрані — позначка замість кнопки", () => {
    render(<RowPlayControls campaignId="c" row={row} play={play({ world: { mapId: "w", focusMarkerId: "m" } })} />);

    expect(screen.getByText("● На екрані")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Показати на карті" })).toBeNull();
  });

  it("недоступне місце — кнопка вимкнена", () => {
    world.map = { data: undefined, isError: true, isLoading: false };
    render(<RowPlayControls campaignId="c" row={row} play={play()} />);

    expect((screen.getByRole("button", { name: "Показати на карті" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Місце недоступне")).toBeTruthy();
  });
});
