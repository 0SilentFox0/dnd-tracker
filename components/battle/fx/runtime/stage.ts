import { fitCanvas } from "./canvas-size";
import { SpriteParticles } from "./particles";
import { subscribe } from "./ticker";

type Draw = (g: CanvasRenderingContext2D) => void;

interface Tween {
  t: number;
  ms: number;
  fn: (k: number, dt: number) => void;
  done: () => void;
}

export interface Stage {
  layer: HTMLElement;
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  particles: SpriteParticles;
  tweens: Set<Tween>;
  draws: Set<Draw>;
  timers: Set<number>;
  waits: Set<() => void>;
  animations: Set<Animation>;
  unsubscribe: (() => void) | null;
  stopped: boolean;
}

const stages = new WeakMap<HTMLElement, Stage>();

const cancels = new WeakMap<HTMLElement, number>();

/** Changes on every `cancelLayer`, so a run that waited (for its chunk) can tell it was cancelled meanwhile. */
export const layerEpoch = (layer: HTMLElement) => cancels.get(layer) ?? 0;

export function stageFor(layer: HTMLElement) {
  let s = stages.get(layer);

  if (!s) {
    const canvas = document.createElement("canvas");

    layer.appendChild(canvas);

    const g = canvas.getContext("2d");

    if (!g) throw new Error("Canvas 2D недоступний");

    s = { layer, canvas, g, particles: new SpriteParticles(), tweens: new Set(), draws: new Set(), timers: new Set(), waits: new Set(), animations: new Set(), unsubscribe: null, stopped: false };
    stages.set(layer, s);
  }

  const dpr = fitCanvas(s.canvas, layer.clientWidth, layer.clientHeight);

  s.g.setTransform(dpr, 0, 0, dpr, 0, 0);

  return s;
}

/**
 * Ends everything on the stage at once: pending tweens and waits resolve (so awaiting animations
 * run to their end without drawing), timers are dropped and the canvas leaves the layer.
 * The next `stageFor(layer)` starts a fresh stage.
 */
export function stopStage(s: Stage) {
  if (s.stopped) return;

  s.stopped = true;
  s.unsubscribe?.();
  s.unsubscribe = null;
  s.draws.clear();
  s.particles.clear();

  for (const id of s.timers) window.clearTimeout(id);

  s.timers.clear();

  for (const a of s.animations) a.cancel();

  s.animations.clear();

  const tweens = [...s.tweens];

  const waits = [...s.waits];

  s.tweens.clear();
  s.waits.clear();
  tweens.forEach((tw) => tw.done());
  waits.forEach((resolve) => resolve());

  s.canvas.remove();

  if (stages.get(s.layer) === s) stages.delete(s.layer);
}

/** `stopStage` for the layer's stage plus the DOM sprite sheets and ghosts playing in it. */
export function cancelLayer(layer: HTMLElement) {
  cancels.set(layer, layerEpoch(layer) + 1);

  const s = stages.get(layer);

  if (s) stopStage(s);

  for (const el of layer.querySelectorAll(".fxs-sheet, .fx-ghost")) el.remove();
}

function tick(s: Stage, dt: number) {
  for (const tw of s.tweens) {
    const prev = Math.min(tw.t, tw.ms);

    tw.t += dt * 1000;

    const k = Math.min(1, tw.t / tw.ms);

    // The last step is clipped to the tween's end, so integrating with it never overshoots.
    tw.fn(k, (Math.min(tw.t, tw.ms) - prev) / 1000);

    if (k >= 1) {
      s.tweens.delete(tw);
      tw.done();
    }
  }

  const { g, canvas } = s;

  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.restore();

  for (const draw of s.draws) draw(g);

  // A glow left set by a draw would blur every particle (and cost a blur pass each).
  g.shadowBlur = 0;
  s.particles.step(g, dt);

  return s.particles.count > 0 || s.tweens.size > 0 || s.draws.size > 0;
}

// The stage is subscribed to the ticker only while something is alive, so an idle battle costs nothing.
export function wake(s: Stage) {
  if (s.unsubscribe || s.stopped) return;

  s.unsubscribe = subscribe((_, dt) => {
    let alive = false;

    try {
      alive = tick(s, Math.min(0.05, dt));
    } finally {
      if (!alive) s.unsubscribe = null;
    }

    return alive;
  });
}

export function tween(s: Stage, ms: number, fn: (k: number, dt: number) => void) {
  return new Promise<void>((resolve) => {
    if (s.stopped) return resolve();

    s.tweens.add({ t: 0, ms, fn, done: resolve });
    wake(s);
  });
}

export function show(s: Stage, draw: Draw) {
  if (s.stopped) return () => false;

  s.draws.add(draw);
  wake(s);

  return () => s.draws.delete(draw);
}

/** `draw` every frame for `ms`, given the elapsed ms; `onTick` runs first on each frame with the same time and dt (s). */
export function timeline(s: Stage, ms: number, draw: (g: CanvasRenderingContext2D, t: number) => void, onTick?: (t: number, dt: number) => void) {
  let t = 0;

  const hide = show(s, (g) => draw(g, t));

  return tween(s, ms, (k, dt) => {
    t = k * ms;
    onTick?.(t, dt);
  }).then(() => void hide());
}

/** A timer owned by the stage: `stopStage` drops it without running `fn`. */
export function schedule(s: Stage, ms: number, fn: () => void) {
  if (s.stopped) return;

  const id = window.setTimeout(() => {
    s.timers.delete(id);
    fn();
  }, ms);

  s.timers.add(id);
}

/** Resolves after `ms`, or at once when the stage stops. */
export function wait(s: Stage, ms: number) {
  return new Promise<void>((resolve) => {
    if (s.stopped) return resolve();

    const done = () => {
      s.waits.delete(done);
      resolve();
    };

    s.waits.add(done);
    schedule(s, ms, done);
  });
}

/**
 * A WAAPI animation on a DOM element, owned by the stage so `stopStage` cancels it; resolves when it ends either way.
 * No element resolves at once. A start later is `opts.delay`: without `fill` the element is untouched until then.
 */
export function animateEl(s: Stage, el: Element | null | undefined, keyframes: Keyframe[], opts: KeyframeAnimationOptions) {
  if (s.stopped || !el) return Promise.resolve();

  const anim = el.animate(keyframes, opts);

  s.animations.add(anim);

  return anim.finished.then(
    () => undefined,
    () => undefined,
  ).finally(() => s.animations.delete(anim));
}
