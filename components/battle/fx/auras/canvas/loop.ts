import { AURA_ANIMATIONS } from "./index";
import { type AuraAnimation, type AuraCtx, AuraParticles } from "./types";

import type { FxAuraKind } from "@/lib/utils/battle/fx";

const FRAME_MS = 1000 / 30;

const WARMUP_FRAMES = 24;

export const AURA_PAD = 0.6;

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

let raf = 0;

let last = 0;

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

function tick(now: number) {
  raf = 0;

  if (!entries.size) return;

  raf = requestAnimationFrame(tick);

  // rAF fires at the display rate; auras only need ~30 fps.
  if (now - last < FRAME_MS - 2) return;

  const dt = Math.min(0.1, (now - last) / 1000);

  last = now;

  for (const e of entries.values()) if (e.visible) paint(e, (now - e.t0) / 1000, dt);
}

function wake() {
  if (raf) return;

  last = performance.now();
  raf = requestAnimationFrame(tick);
}

function unregister(canvas: HTMLCanvasElement) {
  if (!entries.delete(canvas)) return;

  observer?.unobserve(canvas);

  if (!entries.size && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

// Sizes the canvas to the portrait plus padding and starts painting `kinds` (`still`: one static frame, no loop); returns the detach function.
export function attachAura(canvas: HTMLCanvasElement, kinds: FxAuraKind[], size: number, still = false) {
  const g = canvas.getContext("2d");

  if (!g || !kinds.length) return () => undefined;

  unregister(canvas);

  const pad = Math.round(size * AURA_PAD);

  const box = size + pad * 2;

  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(box * dpr);
  canvas.height = Math.round(box * dpr);

  const layers = kinds.map((kind) => ({ anim: AURA_ANIMATIONS[kind], ctx: { cx: box / 2, cy: box / 2, r: size / 2, s: size / 48, parts: new AuraParticles() } }));

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
  return { registered: entries.size, running: raf !== 0 };
}
