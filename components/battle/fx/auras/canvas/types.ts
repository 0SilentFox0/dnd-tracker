import type { AuraParticles } from "../../runtime/particles";

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
