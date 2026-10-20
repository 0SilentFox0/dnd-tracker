// @vitest-environment happy-dom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BattleMap } from "@/components/battle/map";
import { WeatherLayer } from "@/components/battle/map/weather/WeatherLayer";
import { recordingContext } from "@/lib/utils/canvas/__tests__/recording-canvas";
import type { BattleMapConfig } from "@/types/battle";

const unsubscribe = vi.hoisted(() => vi.fn());

const subscribe = vi.hoisted(() => vi.fn(() => unsubscribe));

vi.mock("@/lib/utils/canvas/ticker", () => ({ subscribe }));

class RO {
  constructor(private cb: (entries: { contentRect: { width: number; height: number } }[]) => void) {}
  observe() {
    this.cb([{ contentRect: { width: 400, height: 800 } }]);
  }
  disconnect() {}
  unobserve() {}
}

vi.stubGlobal("ResizeObserver", RO);

let reduced = false;

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "hidden", { value: state === "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  reduced = false;
  subscribe.mockClear();
  unsubscribe.mockClear();
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduced-motion") && reduced, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    return recordingContext(this) as never;
  });
});

afterEach(() => {
  cleanup();
  setVisibility("visible");
});

describe("WeatherLayer", () => {
  it("без погоди — нічого не рендерить і не підписується на кадри", () => {
    const { container } = render(<WeatherLayer weather={null} phone={false} />);

    expect(container.querySelector("[data-weather]")).toBeNull();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("дощ — canvas без подій вказівника, підписка на кадри 30 fps", () => {
    const { container } = render(<WeatherLayer weather="rain" phone={false} />);

    const layer = container.querySelector<HTMLElement>("[data-weather='rain']");

    expect(layer?.className).toContain("pointer-events-none");
    expect(layer?.querySelector("canvas")).not.toBeNull();
    expect(subscribe).toHaveBeenCalledWith(expect.any(Function), { fps: 30 });
  });

  it("prefers-reduced-motion — статичний відтінок без canvas і без кадрів", () => {
    reduced = true;

    const { container } = render(<WeatherLayer weather="fog" phone={false} />);

    expect(container.querySelector("[data-weather-tint]")).not.toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("прихована вкладка зупиняє кадри, повернення — відновлює", () => {
    render(<WeatherLayer weather="snow" phone={false} />);

    expect(subscribe).toHaveBeenCalledTimes(1);

    act(() => setVisibility("hidden"));
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    act(() => setVisibility("visible"));
    expect(subscribe).toHaveBeenCalledTimes(2);
  });
});

describe("BattleMap + погода", () => {
  const wide: BattleMapConfig = { cols: 12, rows: 4, background: null, opacity: 0.3, weather: "storm" };

  it("canvas — прямий нащадок [data-fx-clip], поза шаром повороту телефонної карти", () => {
    const { container } = render(<BattleMap map={wide} participants={[]} phone />);

    expect(container.querySelector("[data-map-rotated]")).not.toBeNull();
    expect(container.querySelector("[data-fx-clip] > [data-weather='storm']")).not.toBeNull();
    expect(container.querySelector("[data-map-rotated] [data-weather]")).toBeNull();
  });

  it("карта без погоди — без шару", () => {
    const { container } = render(<BattleMap map={{ ...wide, weather: undefined }} participants={[]} />);

    expect(container.querySelector("[data-weather]")).toBeNull();
  });
});
