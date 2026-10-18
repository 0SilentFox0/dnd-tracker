import type { AuraParticle } from "../../runtime/particles";
import { twinkle } from "../../runtime/shapes";
import type { AuraCtx } from "./types";

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
