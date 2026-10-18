import { glow, sprite } from "../../runtime/canvas";
import { rand } from "../../runtime/geometry";
import { starPath } from "./shapes";
import { type AuraAnimation } from "./types";

export const stunAura: AuraAnimation = {
  frame(g, ctx, t, dt) {
    const { cx, cy, r, s, parts } = ctx;

    const oy = cy - r * 0.98;

    const rx = r * 0.72;

    const ry = r * 0.24;

    const stars = [0, 1, 2].map((i) => {
      const a = t * 3.2 + (i * Math.PI * 2) / 3;

      return { x: cx + Math.cos(a) * rx, y: oy + Math.sin(a) * ry, depth: (Math.sin(a) + 1) / 2, a };
    });

    stars.sort((p, q) => p.depth - q.depth);

    for (const st of stars) {
      const size = (4.2 + st.depth * 2.2) * s;

      sprite(g, glow("#ffd84a"), st.x, st.y, (size * 3.2) / 64, undefined, 0.5 + st.depth * 0.4);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 0.65 + st.depth * 0.35;
      g.fillStyle = "#ffd23a";
      g.strokeStyle = "#7a4a00";
      g.lineWidth = 0.8 * s;
      starPath(g, st.x, st.y, size, size * 0.45, 5, -Math.PI / 2 + st.a);
      g.fill();
      g.stroke();
      g.fillStyle = "#fff7c8";
      starPath(g, st.x, st.y, size * 0.45, size * 0.2, 5, -Math.PI / 2 + st.a);
      g.fill();

      if (Math.random() < 6 * dt) parts.spawn({ x: st.x, y: st.y, vx: rand(-6, 6) * s, vy: rand(-4, 6) * s, life: rand(0.3, 0.5), size0: 5 * s, size1: 1 * s, tint: "#ffe98a" });
    }

    g.globalAlpha = 1;
    parts.step(g, dt);
  },
};
