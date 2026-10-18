import { rand } from "../../runtime/geometry";
import { type Body, ParticlePool } from "../../runtime/particles";
import { glow, sprite } from "../../runtime/texture";

export interface AuraParticle extends Body {
  size0: number;
  size1: number;
  alpha: number;
  tint: string;
  additive: boolean;
  phase: number;
  move?: (p: AuraParticle, dt: number) => void;
  draw?: (g: CanvasRenderingContext2D, p: AuraParticle, k: number) => void;
  pts?: number[];
  tex?: HTMLCanvasElement;
}

export type AuraParticleInit = Partial<AuraParticle> & Pick<AuraParticle, "x" | "y" | "life" | "size0">;

const MAX_PARTICLES = 70;

export class AuraParticles extends ParticlePool<AuraParticle> {
  spawn(init: AuraParticleInit) {
    if (this.count >= MAX_PARTICLES) return;

    this.add({ vx: 0, vy: 0, gravity: 0, drag: 0, age: 0, size1: init.size0, alpha: 1, tint: "#ffffff", additive: true, phase: rand(0, Math.PI * 2), ...init });
  }

  // Spawns ~rate per second regardless of the frame rate.
  emit(rate: number, dt: number, make: () => AuraParticleInit) {
    const n = Math.floor(rate * dt + Math.random());

    for (let i = 0; i < n; i++) this.spawn(make());
  }

  protected move(p: AuraParticle, dt: number) {
    if (p.move) p.move(p, dt);
    else super.move(p, dt);
  }

  protected draw(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
    if (p.draw) p.draw(g, p, k);
    else sprite(g, (p.tex ??= glow(p.tint)), p.x, p.y, (p.size0 + (p.size1 - p.size0) * k) / 64, undefined, p.alpha * fadeInOut(k), p.additive);
  }
}

export interface AuraCtx {
  cx: number;
  cy: number;
  /** Portrait radius in CSS px. */
  r: number;
  /** Scale relative to a 48 px portrait. */
  s: number;
  parts: AuraParticles;
}

export interface AuraAnimation {
  frame(g: CanvasRenderingContext2D, ctx: AuraCtx, t: number, dt: number): void;
}

export function fadeInOut(k: number, edge = 0.2) {
  return Math.min(1, k / edge, (1 - k) / edge);
}

export function onRim(ctx: AuraCtx, angle: number, scale = 1) {
  return { x: ctx.cx + Math.cos(angle) * ctx.r * scale, y: ctx.cy + Math.sin(angle) * ctx.r * scale };
}

// Paints only outside the portrait disc so the face stays readable.
export function outside(g: CanvasRenderingContext2D, ctx: AuraCtx, paint: () => void) {
  g.save();
  g.beginPath();
  g.rect(ctx.cx - ctx.r * 4, ctx.cy - ctx.r * 4, ctx.r * 8, ctx.r * 8);
  g.arc(ctx.cx, ctx.cy, ctx.r - 0.5, 0, Math.PI * 2);
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
