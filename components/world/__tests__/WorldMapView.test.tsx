// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldMapView } from "../WorldMapView";

import type { WorldMapDetail, WorldMarker } from "@/types/world";

// eslint-disable-next-line @next/next/no-img-element
vi.mock("next/image", () => ({ default: (p: { alt: string }) => <img alt={p.alt} /> }));

const marker = (o: Partial<WorldMarker>): WorldMarker => ({
  id: "m",
  mapId: "map",
  kind: "point",
  x: 0.5,
  y: 0.5,
  polygon: null,
  name: "Marker",
  icon: null,
  color: null,
  dmNote: null,
  alwaysVisible: false,
  sortOrder: 0,
  childMapId: null,
  ...o,
});

const detail = (markers: WorldMarker[]): WorldMapDetail => ({
  map: { id: "map", name: "World", parentMarkerId: null, parentMapId: null, imageUrl: "https://x/w.webp", width: 800, height: 600, fogEnabled: true, revealRadius: 0.05, entryX: 0.5, entryY: 0.5, updatedAt: "" },
  markers,
});

const ring = (pts: [number, number][]) => [...pts, pts[0]];

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const box = () => screen.getByTestId("world-map-box");

describe("WorldMapView", () => {
  it("renders a polygon per zone and a button per marker", () => {
    const zone = marker({ id: "z", kind: "zone", name: "Forest", polygon: ring([[0.1, 0.1], [0.4, 0.1], [0.2, 0.4]]) });

    const { container } = render(<WorldMapView detail={detail([marker({ id: "p", name: "Town" }), zone])} />);

    expect(container.querySelectorAll("polygon")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Town" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Forest" })).toBeTruthy();
  });

  it("clicking the background reports a normalised point", () => {
    const onMapClick = vi.fn();

    render(<WorldMapView detail={detail([])} handlers={{ onMapClick }} />);
    fireEvent.pointerDown(box(), { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerUp(box(), { pointerId: 1, clientX: 200, clientY: 150 });

    expect(onMapClick).toHaveBeenCalledWith({ x: 0.25, y: 0.25 });
  });

  it("a map drag does not place a point", () => {
    const onMapClick = vi.fn();

    render(<WorldMapView detail={detail([])} handlers={{ onMapClick }} />);
    fireEvent.pointerDown(box(), { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(box(), { pointerId: 1, clientX: 220, clientY: 150 });
    fireEvent.pointerUp(box(), { pointerId: 1, clientX: 220, clientY: 150 });

    expect(onMapClick).not.toHaveBeenCalled();
  });

  it("clicking a pin selects it without a map click", () => {
    const onMapClick = vi.fn();

    const onMarkerClick = vi.fn();

    render(<WorldMapView detail={detail([marker({ id: "p", name: "Town" })])} handlers={{ onMapClick, onMarkerClick }} />);

    const pin = screen.getByRole("button", { name: "Town" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 400, clientY: 300 });
    fireEvent.pointerUp(pin, { pointerId: 1, clientX: 400, clientY: 300 });

    expect(onMarkerClick).toHaveBeenCalledWith("p");
    expect(onMapClick).not.toHaveBeenCalled();
  });

  it("dragging a point pin reports its new position", () => {
    const onMarkerDrag = vi.fn();

    const onMarkerClick = vi.fn();

    render(<WorldMapView detail={detail([marker({ id: "p", name: "Town" })])} handlers={{ onMarkerDrag, onMarkerClick }} />);

    const pin = screen.getByRole("button", { name: "Town" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(pin, { pointerId: 1, clientX: 480, clientY: 300 });
    fireEvent.pointerUp(pin, { pointerId: 1, clientX: 480, clientY: 300 });

    expect(onMarkerDrag).toHaveBeenCalledWith("p", { x: 0.6, y: 0.5 });
    expect(onMarkerClick).not.toHaveBeenCalled();
  });

  it("draws an open draft as a polyline", () => {
    const { container } = render(<WorldMapView detail={detail([])} draft={[{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.2 }]} />);

    expect(container.querySelector("polyline")).toBeTruthy();
  });
});
