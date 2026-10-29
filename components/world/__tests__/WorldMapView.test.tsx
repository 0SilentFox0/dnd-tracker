// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldMapView } from "../WorldMapView";

import { render } from "@/components/ui/__tests__/uk-intl";
import type { WorldMapDetail, WorldMarker } from "@/types/world";

vi.unmock("next-intl");

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

  it("keeps the hint at the top so it never covers the bottom-right zoom buttons", () => {
    render(<WorldMapView detail={detail([])} hint={<p>підказка</p>} />);

    const wrap = screen.getByText("підказка").parentElement as HTMLElement;

    expect(wrap.className).toContain("top-2");
    expect(wrap.className).toContain("right-2");
    expect(wrap.className).toContain("left-2");
    expect(wrap.className).not.toContain("bottom-");
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

  it("dragging a pin in point mode moves it without creating a marker", () => {
    const onMarkerDrag = vi.fn();

    const onMapClick = vi.fn();

    render(<WorldMapView detail={detail([marker({ id: "p", name: "Town" })])} tool="point" handlers={{ onMarkerDrag, onMapClick }} />);

    const pin = screen.getByRole("button", { name: "Town" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(pin, { pointerId: 1, clientX: 480, clientY: 300 });
    fireEvent.pointerUp(box(), { pointerId: 1, clientX: 480, clientY: 300 });

    expect(onMapClick).not.toHaveBeenCalled();

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(pin, { pointerId: 1, clientX: 480, clientY: 300 });
    fireEvent.pointerUp(pin, { pointerId: 1, clientX: 480, clientY: 300 });

    expect(onMarkerDrag).toHaveBeenCalledTimes(1);
    expect(onMapClick).not.toHaveBeenCalled();
  });

  it("a plain click on a pin in point mode does not create a point", () => {
    const onMapClick = vi.fn();

    render(<WorldMapView detail={detail([marker({ id: "p", name: "Town" })])} tool="point" handlers={{ onMapClick }} />);

    const pin = screen.getByRole("button", { name: "Town" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 400, clientY: 300 });
    fireEvent.pointerUp(pin, { pointerId: 1, clientX: 400, clientY: 300 });

    expect(onMapClick).not.toHaveBeenCalled();
  });

  it("without onMarkerDrag a pin is not draggable and its click is ignored", () => {
    const onMarkerClick = vi.fn();

    render(<WorldMapView detail={detail([marker({ id: "p", name: "Town" })])} tool="zone" handlers={{ onMarkerClick: undefined }} />);

    const pin = screen.getByRole("button", { name: "Town" });

    fireEvent.pointerDown(pin, { pointerId: 1, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(pin, { pointerId: 1, clientX: 480, clientY: 300 });
    fireEvent.pointerUp(pin, { pointerId: 1, clientX: 480, clientY: 300 });

    expect(onMarkerClick).not.toHaveBeenCalled();
    expect(pin.dataset.dragging).toBe("false");
  });

  it("clicking a zone area in select mode selects it, not in point mode", () => {
    const onMarkerClick = vi.fn();

    const zone = marker({ id: "z", kind: "zone", name: "Forest", polygon: ring([[0.1, 0.1], [0.4, 0.1], [0.2, 0.4]]) });

    const { container, rerender } = render(<WorldMapView detail={detail([zone])} tool="select" handlers={{ onMarkerClick }} />);

    const poly = container.querySelector("polygon") as Element;

    fireEvent.pointerDown(poly, { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerUp(poly, { pointerId: 1, clientX: 200, clientY: 150 });

    expect(onMarkerClick).toHaveBeenCalledWith("z");
    expect(poly.getAttribute("data-interactive")).toBe("true");

    rerender(<WorldMapView detail={detail([zone])} tool="point" handlers={{ onMarkerClick }} />);

    expect((container.querySelector("polygon") as Element).getAttribute("data-interactive")).toBe("false");
  });

  it("clicking a zone area in move mode resolves the zone as a target", () => {
    const onMarkerClick = vi.fn();

    const zone = marker({ id: "z", kind: "zone", name: "Forest", polygon: ring([[0.1, 0.1], [0.4, 0.1], [0.2, 0.4]]) });

    const { container } = render(<WorldMapView detail={detail([zone])} tool="move" handlers={{ onMarkerClick }} />);

    const poly = container.querySelector("polygon") as Element;

    fireEvent.pointerDown(poly, { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerUp(poly, { pointerId: 1, clientX: 200, clientY: 150 });

    expect(onMarkerClick).toHaveBeenCalledWith("z");
    expect(poly.getAttribute("data-interactive")).toBe("true");
  });

  it("shows the pin label state for selected pins and hides zone labels at high zoom", () => {
    const zone = marker({ id: "z", kind: "zone", name: "Forest", x: 0.8, y: 0.8, polygon: ring([[0.7, 0.7], [0.9, 0.7], [0.8, 0.9]]) });

    render(<WorldMapView detail={detail([marker({ id: "p", name: "Town", x: 0.1, y: 0.1 }), zone])} selectedId="p" />);

    expect(screen.getByRole("button", { name: "Town" }).dataset.selected).toBe("true");
    expect(screen.getByRole("button", { name: "Forest" })).toBeTruthy();

    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Наблизити" }));

    expect(screen.queryByRole("button", { name: "Forest" })).toBeNull();
  });

  it("hides a zone label that clashes with a pin", () => {
    const zone = marker({ id: "z", kind: "zone", name: "Forest", polygon: ring([[0.4, 0.4], [0.6, 0.4], [0.5, 0.6]]) });

    render(<WorldMapView detail={detail([marker({ id: "p", name: "Town", x: 0.5, y: 0.47 }), zone])} />);

    expect(screen.queryByRole("button", { name: "Forest" })).toBeNull();
  });

  it("highlights the first draft vertex once the zone can be closed", () => {
    const { container } = render(<WorldMapView detail={detail([])} tool="zone" draft={[{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.2 }, { x: 0.2, y: 0.4 }]} />);

    expect(container.querySelectorAll('.atlas-draft-dot[data-closable="true"]')).toHaveLength(1);
  });

  it("draws an open draft as a polyline", () => {
    const { container } = render(<WorldMapView detail={detail([])} draft={[{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.2 }]} />);

    expect(container.querySelector("polyline")).toBeTruthy();
  });

  it("wheel zoom works although the box mounts only after the size is known", () => {
    render(<WorldMapView detail={detail([])} />);

    const scaled = () => (box().firstElementChild as HTMLElement).style.transform;

    expect(scaled()).toContain("scale(1)");

    act(() => void box().dispatchEvent(new WheelEvent("wheel", { deltaY: -100, clientX: 400, clientY: 300, cancelable: true, bubbles: true })));

    expect(scaled()).not.toContain("scale(1)");
  });

  it("a pan that ends over a pin still ends the gesture", () => {
    render(<WorldMapView detail={detail([marker({ id: "p", name: "Town" })])} />);
    fireEvent.click(screen.getByRole("button", { name: "Наблизити" }));

    const offset = () => (box().firstElementChild as HTMLElement).style.transform;

    const pin = screen.getByRole("button", { name: "Town" });

    fireEvent.pointerDown(box(), { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(box(), { pointerId: 1, clientX: 240, clientY: 150 });
    fireEvent.pointerUp(pin, { pointerId: 1, clientX: 240, clientY: 150 });

    const after = offset();

    fireEvent.pointerMove(box(), { pointerId: 1, clientX: 300, clientY: 150 });

    expect(offset()).toBe(after);
  });

  it("draws the fog above the map but under pins and heroes", () => {
    const hero = { id: "h", name: "Aria", avatar: null, mapId: "map", x: 0.3, y: 0.3, own: true };

    render(<WorldMapView detail={detail([marker({ id: "p", name: "Town" })])} fog={{ shapes: [], radius: 0.05 }} heroes={[hero]} />);

    const fog = screen.getByTestId("world-fog");

    const after = (el: Element) => Boolean(fog.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);

    expect(after(screen.getByRole("button", { name: "Town" }))).toBe(true);
    expect(after(screen.getByRole("button", { name: "Aria" }))).toBe(true);
    expect(fog.compareDocumentPosition(screen.getByAltText("World")) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it("centres on a focus point", () => {
    render(<WorldMapView detail={detail([])} focus={{ point: { x: 0.5, y: 0.5 }, seq: 1 }} />);

    expect((box().firstElementChild as HTMLElement).style.transform).toBe("translate(-800px, -600px) scale(3)");
  });
});
