// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let rafQueue: FrameRequestCallback[] = [];

const fakeCtx = { setTransform: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), drawImage: vi.fn(), globalAlpha: 1, globalCompositeOperation: "source-over" };

function flushFrames(count: number, stepMs = 16) {
  for (let i = 0; i < count; i++) {
    const queue = rafQueue;

    rafQueue = [];
    vi.advanceTimersByTime(stepMs);
    queue.forEach((cb) => cb(performance.now()));
  }
}

async function load() {
  vi.resetModules();

  return { ...(await import("../runtime/stage")), ...(await import("../runtime/ticker")), ...(await import("../runtime/primitives")) };
}

beforeEach(() => {
  vi.useFakeTimers();
  rafQueue = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => rafQueue.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {
    rafQueue = [];
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ticker", () => {
  it("runs every subscriber from one rAF loop and stops when idle", async () => {
    const { subscribe } = await load();

    const a = vi.fn();

    const b = vi.fn(() => false);

    const off = subscribe(a);

    subscribe(b);
    expect(rafQueue).toHaveLength(1);

    flushFrames(1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(rafQueue).toHaveLength(1);

    flushFrames(1);
    expect(b).toHaveBeenCalledTimes(1);

    off();
    expect(rafQueue).toHaveLength(0);
  });

  it("throttles an fps subscriber without slowing the others", async () => {
    const { subscribe } = await load();

    const fast = vi.fn();

    const slow = vi.fn();

    subscribe(fast);
    subscribe(slow, { fps: 30 });
    flushFrames(10, 16);

    expect(fast).toHaveBeenCalledTimes(10);
    expect(slow.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("a throttled subscriber runs on the first frame after subscribing", async () => {
    const { subscribe } = await load();

    const fn = vi.fn();

    vi.advanceTimersByTime(1000);
    subscribe(fn, { fps: 30 });
    flushFrames(1, 1);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][1]).toBeCloseTo(1 / 60);
  });
});

describe("stage", () => {
  it("tween passes dt in seconds, clipped to the tween's end", async () => {
    const { stageFor, tween } = await load();

    const s = stageFor(document.createElement("div"));

    const steps: number[] = [];

    const done = vi.fn();

    void tween(s, 100, (_, dt) => steps.push(dt)).then(done);
    flushFrames(7, 16);
    await Promise.resolve();

    expect(steps.reduce((a, b) => a + b, 0)).toBeCloseTo(0.1);
    expect(steps.at(-1)).toBeCloseTo(0.004);
    expect(done).toHaveBeenCalled();
  });

  it("stopStage resolves pending tweens and waits, drops timers and frees the layer", async () => {
    const { stageFor, stopStage, tween, wait, schedule, show } = await load();

    const layer = document.createElement("div");

    const s = stageFor(layer);

    const fn = vi.fn();

    const timed = vi.fn();

    const resolved = vi.fn();

    show(s, vi.fn());
    void Promise.all([tween(s, 5000, fn), wait(s, 5000)]).then(resolved);
    schedule(s, 10, timed);

    stopStage(s);
    await Promise.resolve();
    await Promise.resolve();

    expect(resolved).toHaveBeenCalled();
    expect(layer.querySelector("canvas")).toBeNull();
    expect(rafQueue).toHaveLength(0);

    vi.advanceTimersByTime(20);
    expect(timed).not.toHaveBeenCalled();

    const fresh = stageFor(layer);

    expect(fresh).not.toBe(s);
    expect(fresh.stopped).toBe(false);
  });

  it("a stopped stage ignores new work, so a cancelled animation runs to its end without drawing", async () => {
    const { stageFor, stopStage, tween, wait, show, emit } = await load();

    const s = stageFor(document.createElement("div"));

    stopStage(s);

    const fn = vi.fn();

    const draw = vi.fn();

    await Promise.all([tween(s, 1000, fn), wait(s, 1000)]);
    show(s, draw);
    emit(s, { x: 0, y: 0 }, { tints: ["#ffffff"], speed: [1, 2], life: [1, 2], scale: [1, 1] });

    expect(fn).not.toHaveBeenCalled();
    expect(s.particles.count).toBe(0);
    expect(rafQueue).toHaveLength(0);
  });

  it("cancelLayer also removes sprite sheets playing in the layer", async () => {
    const { cancelLayer, stageFor } = await load();

    const layer = document.createElement("div");

    stageFor(layer);

    const sheet = document.createElement("div");

    sheet.className = "fxs-sheet";
    layer.appendChild(sheet);
    cancelLayer(layer);

    expect(layer.children).toHaveLength(0);
  });

  it("stopStage cancels the DOM animations it owns", async () => {
    const { animateEl, stageFor, stopStage } = await load();

    const s = stageFor(document.createElement("div"));

    let reject: (e: unknown) => void = () => undefined;

    const anim = { finished: new Promise((_, r) => (reject = r)), cancel: vi.fn(() => reject(new DOMException("aborted", "AbortError"))) };

    const el = document.createElement("div");

    el.animate = vi.fn(() => anim as unknown as Animation);

    const done = vi.fn();

    void animateEl(s, el, [{ transform: "none" }], { duration: 420 }).then(done);
    stopStage(s);
    await vi.waitFor(() => expect(done).toHaveBeenCalled());

    expect(anim.cancel).toHaveBeenCalledTimes(1);
    expect(s.animations.size).toBe(0);
  });

  it("timeline draws with the elapsed ms, ticks before each draw and removes its draw at the end", async () => {
    const { stageFor, timeline } = await load();

    const s = stageFor(document.createElement("div"));

    const drawn: number[] = [];

    const ticks: number[] = [];

    let done = false;

    void timeline(s, 100, (_, t) => drawn.push(t), (t) => ticks.push(t)).then(() => (done = true));

    flushFrames(8, 20);
    await vi.advanceTimersByTimeAsync(0);

    expect(done).toBe(true);
    expect(drawn.slice(0, 3)).toEqual(ticks.slice(0, 3));
    expect(drawn.every((t, i) => !i || t >= drawn[i - 1])).toBe(true);
    expect(s.draws.size).toBe(0);
  });

  it("animateEl without an element resolves at once and owns nothing", async () => {
    const { animateEl, stageFor } = await load();

    const s = stageFor(document.createElement("div"));

    await expect(animateEl(s, null, [], { duration: 100 })).resolves.toBeUndefined();
    expect(s.animations.size).toBe(0);
  });
});
