import { emit, show, tween } from "../../runtime/canvas";
import { rand } from "../../runtime/geometry";
import { clamp01, type FrameAnimation, roundRect } from "./types";

interface Plus {
  x: number;
  y: number;
  size: number;
  at: number;
  rise: number;
  drift: number;
}

const MOTE = ["#e6ffd8", "#a6f58a", "#6fdc6a"];

const HEAL_MS = 1500;

const LIFE = 0.55;

function plus(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const t = size * 0.32;

  g.beginPath();
  g.roundRect(x - size / 2, y - t / 2, size, t, t / 2);
  g.roundRect(x - t / 2, y - size / 2, t, size, t / 2);
  g.fill();
}

export const healFrame: FrameAnimation = async (s, box) => {
  let k = 0;

  const count = Math.max(7, Math.round(box.w / 40));

  const pluses: Plus[] = Array.from({ length: count }, (_, i) => ({ x: box.x + ((i + rand(0.15, 0.85)) / count) * box.w, y: box.y + box.h - rand(4, box.h * 0.35), size: rand(7, 12), at: rand(0, 0.45), rise: rand(25, Math.max(30, box.h * 0.7)), drift: rand(-6, 6) }));

  const hide = show(s, (g) => {
    const a = clamp01(k / 0.2) * clamp01((1 - k) / 0.35);

    g.save();
    g.globalCompositeOperation = "lighter";

    const fill = g.createLinearGradient(0, box.y + box.h, 0, box.y);

    fill.addColorStop(0, `rgba(110,230,110,${0.42 * a})`);
    fill.addColorStop(0.6, `rgba(90,200,100,${0.1 * a})`);
    fill.addColorStop(1, "rgba(90,200,100,0)");
    roundRect(g, box);
    g.fillStyle = fill;
    g.fill();
    g.shadowColor = "#7dff8a";
    g.shadowBlur = 14 * a;
    g.strokeStyle = `rgba(160,255,160,${0.75 * a})`;
    g.lineWidth = 1.8;
    roundRect(g, box);
    g.stroke();
    g.shadowBlur = 10;
    g.shadowColor = "#5fe86a";

    for (const p of pluses) {
      const t = (k - p.at) / LIFE;

      if (t <= 0 || t >= 1) continue;

      const ease = 1 - (1 - t) ** 2;

      g.globalAlpha = Math.sin(t * Math.PI);
      g.fillStyle = "#d9ffd0";
      plus(g, p.x + p.drift * ease, p.y - p.rise * ease, p.size * (0.6 + 0.4 * Math.sin(t * Math.PI)));
    }

    g.restore();
  });

  await tween(s, HEAL_MS, (v) => {
    k = v;

    if (v < 0.7 && Math.random() < 0.5) emit(s, { x: box.x + rand(4, box.w - 4), y: box.y + box.h - rand(0, 6) }, { tints: MOTE, speed: [15, 40], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [0.6, 1], scale: [0.12, 0.03], gravity: -20 });
  });
  hide();
};
