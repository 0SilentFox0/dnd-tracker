// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubCanvasContexts } from "./recording-canvas";

import type { FxArchetype } from "@/lib/utils/battle/fx";

// Area spells rarely catch more; each extra target adds its stagger to the run.
const MAX_TARGETS = 6;

const FRAME_MS = 16;

// Below 20 fps the stage's 50 ms dt cap stretches a run in wall-clock time; this much headroom covers ~15 fps.
const SLOW_FRAMES = 1.3;

let rafQueue: FrameRequestCallback[] = [];

const liveAnimations = new Set<FakeAnimation>();

class FakeAnimation {
  finished: Promise<void>;
  private settle!: (ok: boolean) => void;
  private timer: ReturnType<typeof setTimeout>;

  constructor(ms: number, readonly target: Element | null = null) {
    this.finished = new Promise<void>((resolve, reject) => {
      this.settle = (ok) => {
        liveAnimations.delete(this);

        if (ok) resolve();
        else reject(new DOMException("cancelled", "AbortError"));
      };
    });
    this.finished.catch(() => undefined);
    this.timer = setTimeout(() => this.settle(true), ms);
    liveAnimations.add(this);
  }

  cancel() {
    clearTimeout(this.timer);
    this.settle(false);
  }
}

function waapiMs(opts: KeyframeAnimationOptions | number | undefined) {
  if (typeof opts === "number") return opts;

  const duration = typeof opts?.duration === "number" ? opts.duration : 0;

  const iterations = opts?.iterations ?? 1;

  if (!Number.isFinite(iterations)) throw new Error("an infinite WAAPI animation never finishes");

  return (opts?.delay ?? 0) + duration * iterations + (opts?.endDelay ?? 0);
}

// Sprite sheets run a CSS animation for `--dur` after `animation-delay`.
function cssAnimations(this: HTMLElement) {
  const ms = parseFloat(this.style.getPropertyValue("--dur")) || 0;

  return ms ? [new FakeAnimation(ms + (parseFloat(this.style.animationDelay) || 0), this) as unknown as Animation] : [];
}

function rect(x: number, y: number, w: number, h: number) {
  return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect;
}

function row(x: number, y: number) {
  const el = document.createElement("div");

  el.dataset.fxParticipant = `p${x}-${y}`;
  el.innerHTML = "<span>Огр</span>";
  el.getBoundingClientRect = () => rect(x, y, 220, 60);
  document.body.append(el);

  return el;
}

async function setup() {
  vi.resetModules();

  const { ANIMATIONS } = await import("../animations");

  const { PALETTE } = await import("../runtime/palette");

  const { cancelLayer, stageFor } = await import("../runtime/stage");

  const { MAX_FX_MS } = await import("@/lib/utils/battle/fx");

  const layer = document.createElement("div");

  Object.defineProperty(layer, "clientWidth", { value: 1000 });
  Object.defineProperty(layer, "clientHeight", { value: 800 });
  layer.getBoundingClientRect = () => rect(0, 0, 1000, 800);
  document.body.append(layer);

  const play = (archetype: FxArchetype, targets: number) => {
    const actorEl = row(40, 40);

    const targetEls = Array.from({ length: targets }, (_, i) => row(600, 60 + i * 110));

    const stage = stageFor(layer);

    const centre = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();

      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const spec = { key: "k", archetype, element: "fire" as const, actorId: "a", actorSide: "player", targetIds: targetEls.map((_, i) => `t${i}`), hit: true, critical: false };

    let done = false;

    const run = ANIMATIONS[archetype]({ spec, stage, from: centre(actorEl), to: targetEls.map(centre), targetEls, actorEl, palette: PALETTE[spec.element] }).then(() => {
      done = true;
    });

    return { stage, run, isDone: () => done };
  };

  return { ANIMATIONS, MAX_FX_MS, layer, play, cancelLayer };
}

// Advances the virtual clock one 60 Hz frame: timers first, then the rAF callbacks, then the promise chains.
async function frame() {
  const queue = rafQueue;

  rafQueue = [];
  await vi.advanceTimersByTimeAsync(FRAME_MS);
  queue.forEach((cb) => cb(performance.now()));
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  rafQueue = [];
  liveAnimations.clear();
  document.body.innerHTML = "";
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => rafQueue.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {
    rafQueue = [];
  });
  stubCanvasContexts();
  Element.prototype.animate = function (_kf: Keyframe[] | PropertyIndexedKeyframes | null, opts?: number | KeyframeAnimationOptions) {
    return new FakeAnimation(waapiMs(opts)) as unknown as Animation;
  };
  Element.prototype.getAnimations = cssAnimations as () => Animation[];
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ARCHETYPES = Object.keys((await import("../animations")).ANIMATIONS) as FxArchetype[];

describe("animation runs", () => {
  it.each(ARCHETYPES)(`%s: finishes well within MAX_FX_MS on ${MAX_TARGETS} targets and leaves nothing behind`, async (archetype) => {
    const { MAX_FX_MS, layer, play } = await setup();

    const { stage, isDone } = play(archetype, MAX_TARGETS);

    let elapsed = 0;

    while (!isDone() && elapsed < MAX_FX_MS + 2000) {
      await frame();
      elapsed += FRAME_MS;
    }

    expect(isDone()).toBe(true);
    expect(elapsed * SLOW_FRAMES).toBeLessThan(MAX_FX_MS);
    expect(stage.draws.size).toBe(0);
    expect(stage.tweens.size).toBe(0);
    expect(stage.animations.size).toBe(0);
    expect(liveAnimations.size).toBe(0);
    expect(layer.querySelectorAll(".fx-ghost, .fxs-sheet")).toHaveLength(0);

    // Particles may outlive the run by their lifetime, then the stage goes idle.
    for (let i = 0; i < 120 && rafQueue.length; i++) await frame();

    expect(stage.particles.count).toBe(0);
    expect(rafQueue).toHaveLength(0);
  });

  it.each(ARCHETYPES)("%s: cancelling mid-run resolves it and clears the stage, rows and ghosts", async (archetype) => {
    const { layer, play, cancelLayer } = await setup();

    const { stage, isDone } = play(archetype, 3);

    for (let i = 0; i < 40; i++) await frame();

    cancelLayer(layer);

    // A browser cancels the CSS animation of a removed node.
    for (const a of [...liveAnimations]) if (a.target && !a.target.isConnected) a.cancel();

    await vi.advanceTimersByTimeAsync(0);

    expect(isDone()).toBe(true);
    expect(stage.stopped).toBe(true);
    expect(stage.draws.size + stage.tweens.size + stage.animations.size + stage.timers.size + stage.particles.count).toBe(0);
    expect(liveAnimations.size).toBe(0);
    expect(layer.querySelectorAll(".fx-ghost, .fxs-sheet, canvas")).toHaveLength(0);
  });
});
