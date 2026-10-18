import { emit, show, tween } from "../runtime/canvas";
import { type FxPoint, rand, wait } from "../runtime/geometry";
import type { FxAnimation } from "./types";

interface Crack {
  pts: FxPoint[];
  width: number;
}

interface Chunk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  round: boolean;
}

function makeCrack(angle: number): Crack {
  const pts: FxPoint[] = [{ x: 0, y: 0 }];

  let a = angle;

  let x = 0;

  let y = 0;

  for (let i = 0; i < 6; i++) {
    a += rand(-0.5, 0.5);
    x += Math.cos(a) * rand(9, 16);
    y += Math.sin(a) * rand(4, 8);
    pts.push({ x, y });
  }

  return { pts, width: rand(2, 3) };
}

export const quake: FxAnimation = async ({ stage, to, palette, spec }) => {
  await Promise.all(
    to.map(async (target, ti) => {
      await wait(ti * 50);

      const base = { x: target.x, y: target.y + 20 };

      const n = spec.critical ? 4 : 3 + (ti % 2);

      const cracks = Array.from({ length: n }, (_, i) => makeCrack((i / n) * Math.PI * 2 + rand(-0.4, 0.4)));

      const chunks: Chunk[] = Array.from({ length: spec.critical ? 10 : 6 + (ti % 5) }, () => ({ x: base.x + rand(-30, 30), y: base.y, vx: rand(-70, 70), vy: rand(-320, -180), size: rand(2.5, 5), round: Math.random() > 0.5 }));

      let k = 0;

      let last = 0;

      const hide = show(stage, (g) => {
        const grow = Math.min(1, k / 0.4);

        g.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        g.globalCompositeOperation = "source-over";
        g.strokeStyle = "#5a3e20";
        g.lineCap = "round";
        g.lineJoin = "round";

        for (const c of cracks) {
          g.lineWidth = c.width;
          g.beginPath();
          g.moveTo(base.x, base.y);

          const shown = grow * (c.pts.length - 1);

          for (let i = 1; i <= Math.ceil(shown); i++) {
            const prev = c.pts[i - 1];

            const cur = c.pts[i];

            const f = Math.min(1, shown - (i - 1));

            g.lineTo(base.x + prev.x + (cur.x - prev.x) * f, base.y + prev.y + (cur.y - prev.y) * f);
          }

          g.stroke();
        }

        g.fillStyle = "#3a2814";

        for (const ch of chunks) {
          if (k < 0.3) continue;

          g.globalAlpha = Math.max(0, 1 - k) * 1.1;
          g.beginPath();

          if (ch.round) g.arc(ch.x, ch.y, ch.size / 2 + 0.5, 0, Math.PI * 2);
          else g.rect(ch.x - ch.size / 2, ch.y - ch.size / 2, ch.size, ch.size);

          g.fill();
        }

        g.globalAlpha = 1;
      });

      const dust = () => emit(stage, { x: base.x + rand(-26, 26), y: base.y - 2 }, { tints: palette.tints, speed: [20, 110], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.6, 1.1], scale: [0.5, 1.5], gravity: -12, drag: 2, additive: false, alpha: 0.55 });

      await tween(stage, 1000, (v) => {
        const dt = v - last;

        last = v;
        k = v;

        if (v < 0.6) for (let i = 0; i < 2; i++) dust();

        for (const ch of chunks) {
          if (v < 0.3) continue;

          ch.vy += 900 * dt;
          ch.x += ch.vx * dt;
          ch.y += ch.vy * dt;
        }
      });
      hide();
    }),
  );
};
