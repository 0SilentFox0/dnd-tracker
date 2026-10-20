import { AURA_ANIMATIONS } from "./index";
import type { AuraAnimation, AuraCtx } from "./types";

import { AuraParticles } from "@/components/battle/fx/auras/particles";
import type { FxAuraKind } from "@/lib/utils/battle/fx";
import { fitCanvas } from "@/lib/utils/canvas/canvas-size";
import { subscribe } from "@/lib/utils/canvas/ticker";

const FPS = 30;

const WARMUP_FRAMES = 24;

const AURA_PAD = 0.6;

/** Canvas side for a `size` px portrait: the aura spills past it on every side. */
export const auraBox = (size: number) => size + Math.round(size * AURA_PAD) * 2;

interface Layer {
  anim: AuraAnimation;
  ctx: AuraCtx;
}

interface Entry {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  dpr: number;
  layers: Layer[];
  visible: boolean;
  t0: number;
}

const entries = new Map<HTMLCanvasElement, Entry>();

let unsubscribe: (() => void) | null = null;

let observer: IntersectionObserver | null = null;

function watch(canvas: HTMLCanvasElement) {
  if (typeof IntersectionObserver === "undefined") return true;

  observer ??= new IntersectionObserver((records) => {
    for (const r of records) {
      const e = entries.get(r.target as HTMLCanvasElement);

      if (e) e.visible = r.isIntersecting;
    }
  }, { rootMargin: "64px" });
  observer.observe(canvas);

  return false;
}

function paint(e: Entry, t: number, dt: number) {
  const { g, canvas, dpr } = e;

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  for (const { anim, ctx } of e.layers) {
    anim.frame(g, ctx, t, dt);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
}

let warned = false;

// One subscriber serves every aura, so a throwing paint drops only its own canvas instead of the whole loop.
function tick(now: number, dt: number) {
  for (const e of entries.values()) {
    if (!e.visible) continue;

    try {
      paint(e, (now - e.t0) / 1000, Math.min(0.1, dt));
    } catch (err) {
      unregister(e.canvas);
      e.g.setTransform(1, 0, 0, 1, 0, 0);
      e.g.clearRect(0, 0, e.canvas.width, e.canvas.height);

      if (!warned) {
        warned = true;
        console.warn("fx aura", err);
      }
    }
  }
}

// Auras only need ~30 fps, whatever the display rate.
function wake() {
  unsubscribe ??= subscribe(tick, { fps: FPS });
}

function unregister(canvas: HTMLCanvasElement) {
  if (!entries.delete(canvas)) return;

  observer?.unobserve(canvas);

  if (!entries.size && unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// Sizes the canvas to the portrait plus padding and starts painting `kinds` (`still`: one static frame, no loop); returns the detach function.
export function attachAura(canvas: HTMLCanvasElement, kinds: FxAuraKind[], size: number, still = false) {
  const g = canvas.getContext("2d");

  if (!g || !kinds.length) return () => undefined;

  unregister(canvas);

  const box = auraBox(size);

  const dpr = fitCanvas(canvas, box, box);

  const layers = kinds.map((kind) => ({ anim: AURA_ANIMATIONS[kind], ctx: { cx: box / 2, cy: box / 2, r: size / 2, s: size / 48, parts: new AuraParticles(), box, dpr, cache: new Map() } }));

  // Random phase so neighbouring rows do not pulse in lockstep.
  const entry: Entry = { canvas, g, dpr, layers, visible: false, t0: performance.now() - Math.random() * 4000 };

  if (still) {
    for (let i = 0; i < WARMUP_FRAMES; i++) paint(entry, 1.2 + i / 30, 1 / 30);

    return () => undefined;
  }

  entries.set(canvas, entry);
  entry.visible = watch(canvas);
  wake();

  return () => unregister(canvas);
}

export function auraLoopState() {
  return { registered: entries.size, running: unsubscribe !== null };
}
