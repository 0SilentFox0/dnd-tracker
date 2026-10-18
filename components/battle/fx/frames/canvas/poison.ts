import { emit, show, tween } from "../../runtime/canvas";
import { rand } from "../../runtime/geometry";
import { type FrameAnimation, roundRect } from "./types";

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  age: number;
  life: number;
}

const POP = ["#d8ff7a", "#9be03a", "#6cc22a"];

const BUBBLE_MS = 1300;

const FADE_MS = 500;

export const poisonFrame: FrameAnimation = async (s, box) => {
  let bubbles: Bubble[] = [];

  let glow = 0;

  const hide = show(s, (g) => {
    g.save();

    const fill = g.createLinearGradient(0, box.y + box.h, 0, box.y);

    fill.addColorStop(0, `rgba(110,200,30,${0.5 * glow})`);
    fill.addColorStop(0.55, `rgba(90,160,20,${0.16 * glow})`);
    fill.addColorStop(1, `rgba(90,160,20,${0.06 * glow})`);
    roundRect(g, box);
    g.fillStyle = fill;
    g.fill();
    g.shadowColor = "#8be02a";
    g.shadowBlur = 14 * glow;
    g.strokeStyle = `rgba(170,240,70,${0.85 * glow})`;
    g.lineWidth = 2;
    roundRect(g, box);
    g.stroke();
    g.shadowBlur = 0;

    for (const b of bubbles) {
      const a = Math.min(1, b.age / 0.15) * glow;

      g.globalAlpha = a;
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      g.fillStyle = "rgba(120,210,40,0.35)";
      g.fill();
      g.strokeStyle = "rgba(205,255,120,0.95)";
      g.lineWidth = 1.2;
      g.stroke();
      g.beginPath();
      g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.28, 0, Math.PI * 2);
      g.fillStyle = "rgba(255,255,230,0.9)";
      g.fill();
    }

    g.restore();
  });

  let last = 0;

  const step = (v: number, total: number, spawn: boolean) => {
    const dt = (v * total - last) / 1000;

    last = v * total;

    if (spawn && bubbles.length < 40) {
      for (let i = 0; i < 2; i++) {
        if (Math.random() < 0.55) bubbles.push({ x: box.x + rand(6, box.w - 6), y: box.y + box.h - rand(0, 6), r: rand(2.5, 6.5), vy: rand(-55, -25), phase: rand(0, Math.PI * 2), age: 0, life: rand(0.5, 1.1) });
      }
    }

    bubbles = bubbles.filter((b) => {
      b.age += dt;
      b.y += b.vy * dt;
      b.x += Math.sin(b.age * 9 + b.phase) * 0.5;

      if (b.age < b.life && b.y > box.y + b.r) return true;

      for (let i = 0; i < 5; i++) emit(s, { x: b.x, y: b.y }, { tints: POP, speed: [25, 55], life: [0.15, 0.3], scale: [0.09, 0.02], drag: 3 });

      return false;
    });
  };

  await tween(s, BUBBLE_MS, (v) => {
    glow = Math.min(1, v / 0.15);
    step(v, BUBBLE_MS, true);
  });
  last = 0;
  await tween(s, FADE_MS, (v) => {
    glow = 1 - v;
    step(v, FADE_MS, false);
  });
  hide();
};
