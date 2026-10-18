import type { AuraParticles } from "../../runtime/particles";

export interface AuraCtx {
  cx: number;
  cy: number;
  /** Portrait radius in CSS px. */
  r: number;
  /** Scale relative to a 48 px portrait. */
  s: number;
  parts: AuraParticles;
  /** Canvas side in CSS px and its backing scale, for layers rendered once at device resolution. */
  box: number;
  dpr: number;
  /** Per-instance store of what does not change between frames (gradients, pre-rendered layers). */
  cache: Map<string, unknown>;
}

export interface AuraAnimation {
  frame(g: CanvasRenderingContext2D, ctx: AuraCtx, t: number, dt: number): void;
}
