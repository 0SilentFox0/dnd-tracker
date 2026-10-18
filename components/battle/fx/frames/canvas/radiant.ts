import { edgeGlow, roundRect } from "../../runtime/frame-kit";
import { rand } from "../../runtime/geometry";
import { emit } from "../../runtime/primitives";
import { starPath } from "../../runtime/shapes";
import { show, tween } from "../../runtime/stage";
import { glow, spritePx } from "../../runtime/texture";
import type { FrameAnimation } from "./types";

interface Twinkle {
  x: number;
  y: number;
  size: number;
  at: number;
}

const GOLD = ["#fff6c8", "#ffe07a", "#ffc93c"];

const BURST_MS = 1300;

const RAYS = 12;

export const radiantFrame: FrameAnimation = async (s, box) => {
  let k = 0;

  const cx = box.x + box.w / 2;

  const cy = box.y + box.h / 2;

  const reach = Math.hypot(box.w, box.h) / 2;

  const spin = rand(0, Math.PI);

  const twinkles: Twinkle[] = Array.from({ length: 10 }, () => ({ x: box.x + rand(8, box.w - 8), y: box.y + rand(6, box.h - 6), size: rand(4, 8), at: rand(0.1, 0.6) }));

  const core = glow("#fff3c0");

  const fill = s.g.createRadialGradient(cx, cy, 0, cx, cy, reach);

  fill.addColorStop(0, "rgba(255,205,90,0.3)");
  fill.addColorStop(1, "rgba(255,200,80,0.08)");

  const rays = s.g.createRadialGradient(cx, cy, 0, cx, cy, reach);

  rays.addColorStop(0, "rgba(255,225,130,0.55)");
  rays.addColorStop(1, "rgba(255,185,50,0)");

  const hide = show(s, (g) => {
    const burst = k < 0.1 ? k / 0.1 : (1 - k) ** 1.5 / 0.9 ** 1.5;

    g.save();
    g.globalCompositeOperation = "lighter";
    g.save();
    roundRect(g, box);
    g.clip();
    g.globalAlpha = burst;
    g.fillStyle = fill;
    g.fillRect(box.x, box.y, box.w, box.h);
    g.fillStyle = rays;

    for (let i = 0; i < RAYS; i++) {
      const a = spin + k * 0.5 + (i * Math.PI * 2) / RAYS;

      const w = i % 2 ? 0.07 : 0.12;

      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a - w) * reach * 1.2, cy + Math.sin(a - w) * reach * 1.2);
      g.lineTo(cx + Math.cos(a + w) * reach * 1.2, cy + Math.sin(a + w) * reach * 1.2);
      g.closePath();
      g.fill();
    }

    g.restore();
    spritePx(g, core, cx, cy, Math.min(box.h, 80) * 1.2 * (0.6 + k), undefined, burst * 0.6);
    g.globalAlpha = 1;

    const rim = 1 + 5 * k;

    edgeGlow(g, { x: box.x - rim, y: box.y - rim, w: box.w + rim * 2, h: box.h + rim * 2 }, { shadow: "#ffd34a", blur: 22 * burst, stroke: `rgba(255,236,150,${burst})`, width: 2.5, radius: 6 + rim });
    g.shadowBlur = 8;
    g.fillStyle = "#fffbe6";

    for (const t of twinkles) {
      const p = (k - t.at) / 0.3;

      if (p <= 0 || p >= 1) continue;

      g.globalAlpha = Math.sin(p * Math.PI);

      const r = t.size * Math.sin(p * Math.PI);

      starPath(g, t.x, t.y, r, r * 0.22, 4, 0);
      g.fill();
    }

    g.restore();
  });

  for (let i = 0; i < 26; i++) emit(s, { x: cx, y: cy }, { tints: GOLD, speed: [50, 170], life: [0.45, 0.9], scale: [0.16, 0.03], drag: 2.2, spread: 6 });

  await tween(s, BURST_MS, (v) => {
    k = v;
  });
  hide();
};
