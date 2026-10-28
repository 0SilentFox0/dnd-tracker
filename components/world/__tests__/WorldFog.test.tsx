// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldFog } from "../WorldFog";
import { WorldHeroes } from "../WorldHeroes";
import { WorldMapView } from "../WorldMapView";

import type { RevealShape, WorldHero, WorldMapDetail } from "@/types/world";

// eslint-disable-next-line @next/next/no-img-element
vi.mock("next/image", () => ({ default: (p: { alt: string }) => <img alt={p.alt} /> }));

const ctx = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  lineWidth: 0,
};

const shapes: RevealShape[] = [{ t: "p", x: 0.2, y: 0.2 }, { t: "s", x1: 0.2, y1: 0.2, x2: 0.6, y2: 0.4 }, { t: "p", x: 0.8, y: 0.8 }];

const props = { shapes, radius: 0.05, box: { width: 800, height: 600 }, zoom: 1, offset: { x: 0, y: 0 }, still: true };

const hero = (o: Partial<WorldHero>): WorldHero => ({ id: "h", name: "Арвен", avatar: null, mapId: "map", x: 0.5, y: 0.5, own: false, ...o });

const detail: WorldMapDetail = {
  map: { id: "map", name: "World", parentMarkerId: null, parentMapId: null, imageUrl: "https://x/w.webp", width: 800, height: 600, fogEnabled: true, revealRadius: 0.05, entryX: 0.5, entryY: 0.5, updatedAt: "" },
  markers: [],
};

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("WorldFog", () => {
  it("carves one arc per point and one stroke per segment", () => {
    render(<WorldFog {...props} />);

    expect(ctx.arc).toHaveBeenCalledTimes(2);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
  });

  it("scales the segment width with zoom", () => {
    const { rerender } = render(<WorldFog {...props} />);

    expect(ctx.lineWidth).toBe(2 * 0.05 * 800);

    rerender(<WorldFog {...props} zoom={2} />);

    expect(ctx.lineWidth).toBe(2 * 0.05 * 800 * 2);
  });
});

describe("WorldFog canvas size", () => {
  it("assigns width/height only when the box changes, not on pan", () => {
    const setWidth = vi.spyOn(HTMLCanvasElement.prototype, "width", "set");

    const { rerender } = render(<WorldFog {...props} />);

    const initial = setWidth.mock.calls.length;

    rerender(<WorldFog {...props} offset={{ x: 10, y: 5 }} />);
    rerender(<WorldFog {...props} offset={{ x: 20, y: 5 }} />);

    expect(setWidth.mock.calls.length).toBe(initial);

    rerender(<WorldFog {...props} box={{ width: 400, height: 300 }} />);

    expect(setWidth.mock.calls.length).toBe(initial + 1);
  });
});

describe("WorldMapView layers", () => {
  it("renders no fog canvas without the fog prop", () => {
    const { container } = render(<WorldMapView detail={detail} />);

    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders the fog canvas and heroes when given", () => {
    const onHeroClick = vi.fn();

    const { container } = render(<WorldMapView detail={detail} fog={{ shapes, radius: 0.05 }} heroes={[hero({ id: "a", name: "A" }), hero({ id: "b", name: "B" })]} handlers={{ onHeroClick }} />);

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: /^[AB]$/ })).toHaveLength(2);
  });
});

describe("WorldHeroes", () => {
  it("marks the own hero and reports clicks", () => {
    const onHeroClick = vi.fn();

    render(<WorldHeroes zoom={2} heroes={[hero({ id: "a", name: "Арвен", own: true }), hero({ id: "b", name: "Борін" })]} onHeroClick={onHeroClick} />);

    expect(screen.getByRole("button", { name: "Арвен" }).dataset.own).toBe("true");
    expect(screen.getByRole("button", { name: "Арвен" }).style.transform).toContain("scale(0.5)");

    fireEvent.pointerUp(screen.getByRole("button", { name: "Борін" }));

    expect(onHeroClick).toHaveBeenCalledWith("b");
  });

  it("falls back to the initial for a non-image avatar string", () => {
    render(<WorldHeroes zoom={1} heroes={[hero({ name: "Арвен", avatar: "not-an-url" })]} />);

    expect(screen.getByRole("button", { name: "Арвен" }).textContent).toBe("А");
  });
});
