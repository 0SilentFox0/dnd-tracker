import { fadeOut } from "./easing";
import type { FxPoint, FxTarget } from "./geometry";
import type { FxPalette } from "./palette";
import { emit, type EmitOptions, flash } from "./primitives";
import { playSheet, SHEETS } from "./sprites";
import { progress, type Stage, wait } from "./stage";
import { glow, sprite } from "./texture";

/** Runs `fn` for every target, the i-th one `i × staggerMs` later. */
export function perTarget(s: Stage, targets: FxTarget[], staggerMs: number | undefined, fn: (target: FxTarget, i: number) => Promise<void>) {
  return Promise.all(
    targets.map(async (target, i) => {
      if (staggerMs) await wait(s, i * staggerMs);

      await fn(target, i);
    }),
  ).then(() => undefined);
}

/** The impact spray of hot particles; `opts` overrides the bolt defaults. */
export function burst(s: Stage, at: FxPoint, tints: string[], count: number, opts: Partial<EmitOptions> = {}) {
  const o: EmitOptions = { tints, speed: [60, 340], life: [0.4, 0.9], scale: [0.6, 0.05], drag: 3.5, gravity: 60, ...opts };

  for (let i = 0; i < count; i++) emit(s, at, o);
}

/** Flash plus the element's sprite sheet on the target, held for `holdMs`. */
export function impactSplash(s: Stage, at: FxPoint, palette: FxPalette, opts: { flash: number; flashMs?: number; sheetScale: number; holdMs?: number }) {
  return Promise.all([
    flash(s, at, palette.core, opts.flash, opts.flashMs ?? 450),
    palette.sprite ? playSheet(s, SHEETS[palette.sprite], at, { scale: opts.sheetScale, ms: 560, filter: palette.filter }) : wait(s, 0),
    wait(s, opts.holdMs ?? 0),
  ]).then(() => undefined);
}

/**
 * A column of light rising from `base` for 1 s: it grows to `height` at `rise` × speed and fades after `holdUntil`.
 * `onTick` gets the progress, for the particles that rise with it.
 */
export function pillar(s: Stage, base: FxPoint, opts: { tint: string; width: number; height: number; rise: number; holdUntil: number }, onTick: (k: number, dt: number) => void) {
  const tex = glow(opts.tint);

  return progress(s, 1000, (g, k) => sprite(g, tex, base.x, base.y, opts.width, opts.height * Math.min(1, k * opts.rise), fadeOut(k, opts.holdUntil), true, 0.9), onTick);
}
