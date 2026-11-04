// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MotionBackground } from "../MotionBackground";

import type { BattleMapConfig, MapMotion } from "@/types/battle";

const ticker = vi.hoisted(() => ({ fns: [] as ((now: number, dt: number) => boolean | void)[], unsub: vi.fn() }));

vi.mock("@/lib/utils/canvas/ticker", () => ({
  subscribe: vi.fn((fn: (now: number, dt: number) => boolean | void) => {
    ticker.fns.push(fn);

    return ticker.unsub;
  }),
}));

const { subscribe } = await import("@/lib/utils/canvas/ticker");

const map: BattleMapConfig = { cols: 10, rows: 5, background: "/battle-maps/a.webp", opacity: 0.3 };

const CELL = 50;

function mount(motion: MapMotion, opts: { rotated?: boolean } = {}) {
  const view = render(<MotionBackground map={map} motion={motion} cellPx={CELL} rotated={opts.rotated ?? false} phone={false} />);

  return view;
}

async function loadImage(container: HTMLElement) {
  const img = container.querySelector("img") as HTMLImageElement;

  Object.defineProperty(img, "naturalWidth", { value: 400, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: 200, configurable: true });
  fireEvent.load(img);
  await waitFor(() => expect(container.querySelector("[data-motion-track]")).not.toBeNull());
}

beforeEach(() => {
  ticker.fns.length = 0;
  vi.mocked(subscribe).mockClear();
  ticker.unsub.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MotionBackground", () => {
  it("renders a static background until the image has loaded", () => {
    const { container } = mount({ axis: "x", speed: 2 });

    expect(container.querySelector("img")).not.toBeNull();
    expect(container.querySelector("[data-motion-track]")).toBeNull();
  });

  it("after load renders an even number of tiles, odd ones mirrored", async () => {
    const { container } = mount({ axis: "x", speed: 2 });

    await loadImage(container);

    const track = container.querySelector("[data-motion-track]") as HTMLElement;

    const tiles = Array.from(track.children) as HTMLElement[];

    expect(tiles.length % 2).toBe(0);
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(tiles[0].style.transform).toBe("");
    expect(tiles[1].style.transform).toContain("scale(-1");
  });

  it("mirrors vertically for the y axis", async () => {
    const { container } = mount({ axis: "y", speed: 2 });

    await loadImage(container);

    const tiles = Array.from(container.querySelector("[data-motion-track]")!.children) as HTMLElement[];

    expect(tiles[1].style.transform).toContain("scale(1, -1)");
  });

  it("subscribes to the ticker once while moving", async () => {
    const { container } = mount({ axis: "x", speed: 2 });

    await loadImage(container);

    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes after the speed decays to a stop", async () => {
    const { container, rerender } = mount({ axis: "x", speed: 2 });

    await loadImage(container);
    rerender(<MotionBackground map={map} motion={{ axis: "x", speed: 0 }} cellPx={CELL} rotated={false} phone={false} />);

    const fn = ticker.fns.at(-1)!;

    let result: boolean | void = undefined;

    act(() => {
      for (let i = 0; i < 400 && result !== false; i++) result = fn(0, 0.05);
    });

    expect(result).toBe(false);
  });

  it("does not animate under prefers-reduced-motion", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));

    const { container } = mount({ axis: "x", speed: 2 });

    await loadImage(container);

    expect(container.querySelector("[data-motion-track]")).not.toBeNull();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("keeps the axis on screen when the map is rotated", async () => {
    const { container } = mount({ axis: "x", speed: 2 }, { rotated: true });

    await loadImage(container);

    expect(container.querySelector("[data-motion-track]")!.getAttribute("data-motion-axis")).toBe("y");
  });

  it("falls back to the default background when the map has none", () => {
    const { container } = render(<MotionBackground map={{ ...map, background: null }} motion={{ axis: "x", speed: 1 }} cellPx={CELL} rotated={false} phone={false} />);

    expect(container.querySelector("img")).not.toBeNull();
  });

  it("does not animate while the tab is hidden", async () => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });

    try {
      const { container } = mount({ axis: "x", speed: 2 });

      await loadImage(container);

      expect(subscribe).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
    }
  });

  it("keeps the track covering the map after the period shrinks while stopped", async () => {
    const { container, rerender } = mount({ axis: "x", speed: 2 });

    await loadImage(container);

    act(() => {
      for (let i = 0; i < 5; i++) ticker.fns.at(-1)!(0, 1);
    });

    rerender(<MotionBackground map={map} motion={{ axis: "x", speed: 0 }} cellPx={10} rotated={false} phone={false} />);

    const track = container.querySelector("[data-motion-track]") as HTMLElement;

    const offset = Number(/translate3d\((-?[\d.]+)px/.exec(track.style.transform)?.[1]);

    expect(offset).toBeLessThanOrEqual(0);
  });
});
