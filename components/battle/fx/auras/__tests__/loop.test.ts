// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const frame = vi.fn();

vi.mock("@/components/battle/fx/auras/index", () => ({ AURA_ANIMATIONS: new Proxy({}, { get: () => ({ frame }) }) }));

let rafQueue: FrameRequestCallback[] = [];

let ioCallback: IntersectionObserverCallback | null = null;

const fakeCtx = { setTransform: vi.fn(), clearRect: vi.fn(), globalAlpha: 1, globalCompositeOperation: "source-over" };

function flushFrames(count: number, stepMs = 40) {
  for (let i = 0; i < count; i++) {
    const queue = rafQueue;

    rafQueue = [];
    vi.advanceTimersByTime(stepMs);
    queue.forEach((cb) => cb(performance.now()));
  }
}

function setVisible(canvas: HTMLCanvasElement, isIntersecting: boolean) {
  ioCallback?.([{ target: canvas, isIntersecting } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
}

async function loadLoop() {
  vi.resetModules();

  return import("@/components/battle/fx/auras/loop");
}

function makeCanvas() {
  const canvas = document.createElement("canvas");

  vi.spyOn(canvas, "getContext").mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D);

  return canvas;
}

beforeEach(() => {
  vi.useFakeTimers();
  rafQueue = [];
  ioCallback = null;
  frame.mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => rafQueue.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {
    rafQueue = [];
  });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(cb: IntersectionObserverCallback) {
      ioCallback = cb;
    }

    observe() {}

    unobserve() {}
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("aura loop", () => {
  it("starts on register and stops when the last canvas leaves", async () => {
    const { attachAura, auraLoopState } = await loadLoop();

    const a = makeCanvas();

    const b = makeCanvas();

    const detachA = attachAura(a, ["burning"], 48);

    const detachB = attachAura(b, ["frost"], 48);

    expect(auraLoopState()).toEqual({ registered: 2, running: true });

    detachA();
    expect(auraLoopState().running).toBe(true);

    detachB();
    expect(auraLoopState()).toEqual({ registered: 0, running: false });
    expect(rafQueue).toHaveLength(0);
  });

  it("paints only visible canvases, at most ~30 fps", async () => {
    const { attachAura } = await loadLoop();

    const shown = makeCanvas();

    const hidden = makeCanvas();

    attachAura(shown, ["burning"], 48);
    attachAura(hidden, ["frost", "stun"], 48);
    setVisible(shown, true);
    setVisible(hidden, false);

    flushFrames(5);
    expect(frame).toHaveBeenCalledTimes(5);

    frame.mockClear();
    flushFrames(10, 16);
    expect(frame.mock.calls.length).toBeLessThanOrEqual(5);

    frame.mockClear();
    setVisible(hidden, true);
    flushFrames(1);
    expect(frame).toHaveBeenCalledTimes(3);
  });

  it("re-attaching the same canvas does not paint it twice", async () => {
    const { attachAura, auraLoopState } = await loadLoop();

    const canvas = makeCanvas();

    attachAura(canvas, ["burning"], 48)();
    attachAura(canvas, ["burning"], 48);
    setVisible(canvas, true);
    flushFrames(1);

    expect(auraLoopState().registered).toBe(1);
    expect(frame).toHaveBeenCalledTimes(1);
  });

  it("still (reduced motion) paints a static frame without registering", async () => {
    const { attachAura, auraLoopState } = await loadLoop();

    attachAura(makeCanvas(), ["shield"], 48, true);

    expect(frame).toHaveBeenCalled();
    expect(auraLoopState()).toEqual({ registered: 0, running: false });
  });

  it("a throwing aura drops only its own canvas; the loop keeps painting the rest", async () => {
    const { attachAura, auraLoopState } = await loadLoop();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const bad = makeCanvas();

    const good = makeCanvas();

    attachAura(bad, ["burning"], 48);
    attachAura(good, ["frost"], 48);
    setVisible(bad, true);
    setVisible(good, true);

    frame.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    flushFrames(1);

    expect(auraLoopState()).toEqual({ registered: 1, running: true });

    frame.mockClear();
    flushFrames(3);

    expect(frame).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
