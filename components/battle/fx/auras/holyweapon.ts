import { centredSprite } from "./kit";
import type { AuraAnimation } from "./types";

import { pick, rand } from "@/components/battle/fx/runtime/geometry";
import { goldBlade } from "@/components/battle/fx/runtime/shapes";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

const CHIME_S = 1.8;

const ANGLE = -Math.PI / 3;

const INCENSE = ["#efe4c8", "#d8ccb0"];

const BLADE_LEVELS = 8;

// Painted around the blade's middle (the sprite centre) to keep the sprite small.
function bladePaint(g: CanvasRenderingContext2D, len: number, s: number, ring: number) {
  g.rotate(ANGLE);
  g.translate(-len / 2, 0);
  g.shadowColor = "#ffd86b";
  g.shadowBlur = (6 + ring * 8) * s;
  goldBlade(g, len, "#8a6a2a");
}

export const holyweaponAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const len = r * 1.9;

    const hx = cx + r * 0.8;

    const hy = cy + r * 1.15;

    const mid = { x: hx + Math.cos(ANGLE) * len * 0.6, y: hy + Math.sin(ANGLE) * len * 0.6 };

    const u = (t % CHIME_S) / CHIME_S;

    const ring = Math.exp(-u * 6);

    spritePx(g, glow("#ffd86b"), mid.x, mid.y, len * 1.3, undefined, 0.6 + ring * 0.4);

    // The ringing blade, like a cathedral bell: a thin ring going out on every chime.
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = (1 - u) * 0.7;
    g.strokeStyle = "#fff1b8";
    g.lineWidth = 1.2 * s;
    g.beginPath();
    g.ellipse(mid.x, mid.y, len * (0.2 + u * 0.7), len * (0.12 + u * 0.4), ANGLE, 0, Math.PI * 2);
    g.stroke();

    const level = Math.round(ring * BLADE_LEVELS);

    const blade = centredSprite(ctx, `blade${level}`, len / 2 + 20 * s, (lg) => bladePaint(lg, len, s, level / BLADE_LEVELS));

    g.save();
    g.translate(hx, hy);
    g.rotate(Math.sin(t * 60) * 0.02 * ring);
    g.translate(Math.cos(ANGLE) * len / 2, Math.sin(ANGLE) * len / 2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.drawImage(blade, -blade.width / 2 / ctx.dpr, -blade.height / 2 / ctx.dpr, blade.width / ctx.dpr, blade.height / ctx.dpr);
    g.restore();

    parts.emit(2.5, dt, () => {
      const f = rand(0.3, 1);

      return { x: hx + Math.cos(ANGLE) * len * f, y: hy + Math.sin(ANGLE) * len * f, vx: rand(-4, 4) * s, vy: -rand(8, 14) * s, life: rand(1, 1.5), size0: rand(3, 4) * s, size1: rand(7, 9) * s, tint: pick(INCENSE), alpha: 0.35, additive: false };
    });
    parts.step(g, dt);
  },
};
