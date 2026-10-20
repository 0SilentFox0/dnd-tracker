import type { FxAnimation } from "./types";

import { bezier, type FxPoint, rand } from "@/components/battle/fx/runtime/geometry";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { timeline } from "@/components/battle/fx/runtime/stage";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const DOTS = 40;

const FLY_MS = ARCHETYPE_FX.swarm.impactMs;

const BUZZ_MS = 500;

interface Bug {
  ctrl: FxPoint;
  amp: number;
  freq: number;
  phase: number;
  orbit: number;
  spin: number;
  dark: boolean;
  delay: number;
}

export const swarm: FxAnimation = async ({ stage, from, to, targets }) => {
  if (!to.length) return;

  const dark = glow("#2a2210");

  const gold = glow("#ffd23a");

  await perTarget(stage, targets, ARCHETYPE_FX.swarm.staggerMs, async ({ at: target }) => {
    const bugs: Bug[] = Array.from({ length: DOTS }, (_, i) => ({
      ctrl: { x: (from.x + target.x) / 2 + rand(-90, 90), y: Math.min(from.y, target.y) - rand(10, 110) },
      amp: rand(6, 18),
      freq: rand(5, 11),
      phase: rand(0, Math.PI * 2),
      orbit: rand(8, 30),
      spin: rand(8, 16) * (i % 2 ? 1 : -1),
      dark: i % 2 === 0,
      delay: rand(0, 0.25),
    }));

    const pos = (b: Bug, t: number): FxPoint & { a: number } => {
      if (t < FLY_MS) {
        const k = Math.min(1, Math.max(0, (t / FLY_MS - b.delay) / (1 - b.delay))) ** 1.2;

        const p = bezier(from, b.ctrl, target, k);

        const j = Math.sin(k * b.freq * Math.PI + b.phase) * b.amp * (1 - k * 0.6);

        return { x: p.x + j, y: p.y + Math.cos(k * b.freq * Math.PI + b.phase) * b.amp * 0.6, a: Math.min(1, k * 6) };
      }

      const u = (t - FLY_MS) / BUZZ_MS;

      const spread = u > 0.7 ? 1 + (u - 0.7) * 10 : 1;

      const ang = b.phase + (t / 1000) * b.spin;

      return { x: target.x + Math.cos(ang) * b.orbit * spread, y: target.y - 10 + Math.sin(ang * 1.3) * b.orbit * 0.7 * spread, a: u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1 };
    };

    await timeline(stage, FLY_MS + BUZZ_MS, (g, t) => {
      for (const b of bugs) {
        const p = pos(b, t);

        if (p.a <= 0) continue;

        if (b.dark) sprite(g, dark, p.x, p.y, 0.22, undefined, p.a, false);
        else sprite(g, gold, p.x, p.y, 0.2, undefined, p.a);
      }

      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    });
  });
};
