import { bottomPoint, edgeGlow, verticalFill } from "../../runtime/frame-kit";
import { chance, rand } from "../../runtime/geometry";
import { emit } from "../../runtime/primitives";
import { show, tween } from "../../runtime/stage";
import type { FrameAnimation } from "./types";

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

  const fill = verticalFill(s.g, box, [[0, "rgba(110,200,30,0.5)"], [0.55, "rgba(90,160,20,0.16)"], [1, "rgba(90,160,20,0.06)"]]);

  const hide = show(s, (g) => {
    g.save();

    edgeGlow(g, box, {
      fill,
      fillAlpha: glow,
      shadow: "#8be02a",
      blur: 14 * glow,
      stroke: `rgba(170,240,70,${0.85 * glow})`,
      width: 2,
    });
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

  const step = (dt: number, spawn: boolean) => {
    if (spawn && bubbles.length < 40) {
      for (let i = 0; i < 2; i++) {
        if (chance(0.55, dt)) bubbles.push({ ...bottomPoint(box, 6, 6), r: rand(2.5, 6.5), vy: rand(-55, -25), phase: rand(0, Math.PI * 2), age: 0, life: rand(0.5, 1.1) });
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

  await tween(s, BUBBLE_MS, (v, dt) => {
    glow = Math.min(1, v / 0.15);
    step(dt, true);
  });
  await tween(s, FADE_MS, (v, dt) => {
    glow = 1 - v;
    step(dt, false);
  });
  hide();
};
