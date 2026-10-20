import type { AuraCtx } from "./types";

import type { AuraParticle } from "@/components/battle/fx/auras/particles";
import { twinkle } from "@/components/battle/fx/runtime/shapes";

type Disc = Pick<AuraCtx, "cx" | "cy" | "r">;

export function onRim(ctx: AuraCtx, angle: number, scale = 1) {
  return { x: ctx.cx + Math.cos(angle) * ctx.r * scale, y: ctx.cy + Math.sin(angle) * ctx.r * scale };
}

// Paints only outside the portrait disc so the face stays readable; `extent` × r bounds the painted square.
export function outside(g: CanvasRenderingContext2D, disc: Disc, paint: () => void, extent = 4) {
  g.save();
  g.beginPath();
  g.rect(disc.cx - disc.r * extent, disc.cy - disc.r * extent, disc.r * extent * 2, disc.r * extent * 2);
  g.arc(disc.cx, disc.cy, disc.r - 0.5, 0, Math.PI * 2);
  g.clip("evenodd");
  paint();
  g.restore();
}

export function rimGlow(g: CanvasRenderingContext2D, ctx: AuraCtx, rgb: string, alpha: number, width = 0.35) {
  g.globalCompositeOperation = "lighter";
  g.lineWidth = ctx.r * width;
  g.strokeStyle = `rgba(${rgb},${alpha * 0.35})`;
  g.beginPath();
  g.arc(ctx.cx, ctx.cy, ctx.r + ctx.r * width * 0.4, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = Math.max(1.2, ctx.s * 1.6);
  g.strokeStyle = `rgba(${rgb},${alpha})`;
  g.beginPath();
  g.arc(ctx.cx, ctx.cy, ctx.r + 0.5, 0, Math.PI * 2);
  g.stroke();
  g.globalCompositeOperation = "source-over";
}

/** A particle `draw` that blinks a four-point star in and out over its life; declare it once per module. */
export function twinkleDraw(color: string, alpha = 1) {
  return (g: CanvasRenderingContext2D, p: AuraParticle, k: number) => twinkle(g, p.x, p.y, p.size0 * Math.sin(k * Math.PI), color, alpha);
}

/** Builds a value once per aura instance (its canvas size never changes; a resize attaches a new one). */
export function memo<T>(ctx: AuraCtx, key: string, make: () => T): T {
  if (!ctx.cache.has(key)) ctx.cache.set(key, make());

  return ctx.cache.get(key) as T;
}

/** A full-canvas layer painted once at device resolution (same coordinates as `frame`), then only blitted. */
export function staticLayer(ctx: AuraCtx, key: string, paint: (g: CanvasRenderingContext2D) => void) {
  return memo(ctx, key, () => {
    const canvas = document.createElement("canvas");

    canvas.width = canvas.height = Math.round(ctx.box * ctx.dpr);

    const lg = canvas.getContext("2d");

    if (lg) {
      lg.setTransform(ctx.dpr, 0, 0, ctx.dpr, 0, 0);
      paint(lg);
    }

    return canvas;
  });
}

// Pixel for pixel: the layer has the target's backing size, so no resampling.
export function drawLayer(g: CanvasRenderingContext2D, layer: HTMLCanvasElement, alpha = 1, op: GlobalCompositeOperation = "source-over") {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = alpha;
  g.globalCompositeOperation = op;
  g.drawImage(layer, 0, 0);
  g.restore();
}

/** A canvas `half` device px from its centre to each edge, painted once with the origin at that centre (CSS px units). */
export function centredSprite(ctx: AuraCtx, key: string, halfCss: number, paint: (g: CanvasRenderingContext2D) => void) {
  return memo(ctx, key, () => {
    const half = Math.ceil(halfCss * ctx.dpr);

    const canvas = document.createElement("canvas");

    canvas.width = canvas.height = half * 2;

    const lg = canvas.getContext("2d");

    if (lg) {
      lg.setTransform(ctx.dpr, 0, 0, ctx.dpr, half, half);
      paint(lg);
    }

    return canvas;
  });
}

// Snapped to whole device pixels so the sprite stays as crisp as a direct draw.
export function drawCentred(g: CanvasRenderingContext2D, ctx: AuraCtx, sprite: HTMLCanvasElement, x: number, y: number) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.drawImage(sprite, Math.round(x * ctx.dpr) - sprite.width / 2, Math.round(y * ctx.dpr) - sprite.height / 2);
  g.restore();
}
