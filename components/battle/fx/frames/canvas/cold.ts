import { clamp01 } from "../../runtime/easing";
import { bottomPoint, edgeGlow, type FrameBox, roundRect } from "../../runtime/frame-kit";
import { rand } from "../../runtime/geometry";
import { emit } from "../../runtime/primitives";
import { show, tween } from "../../runtime/stage";
import type { FrameAnimation } from "./types";

interface Branch {
  x: number;
  y: number;
  angle: number;
  length: number;
  delay: number;
}

const GROW_MS = 1200;

const HOLD_MS = 1500;

const THAW_MS = 800;

// Ice needles grow inward from every edge; each gets two side twigs.
function needles(b: FrameBox): Branch[] {
  const out: Branch[] = [];

  const add = (x: number, y: number, inward: number) => {
    const length = rand(8, 22);

    const delay = rand(0, 0.35);

    const angle = inward + rand(-0.5, 0.5);

    out.push({ x, y, angle, length, delay });

    for (const side of [-1, 1]) {
      const t = rand(0.35, 0.7);

      out.push({ x: x + Math.cos(angle) * length * t, y: y + Math.sin(angle) * length * t, angle: angle + side * rand(0.7, 1.1), length: length * rand(0.3, 0.5), delay: delay + 0.2 });
    }
  };

  for (let x = b.x + 6; x < b.x + b.w; x += rand(5, 9)) {
    add(x, b.y, Math.PI / 2);
    add(x, b.y + b.h, -Math.PI / 2);
  }

  for (let y = b.y + 6; y < b.y + b.h; y += rand(5, 9)) {
    add(b.x, y, 0);
    add(b.x + b.w, y, Math.PI);
  }

  return out;
}

export const coldFrame: FrameAnimation = async (s, box) => {
  const branches = needles(box);

  let grow = 0;

  let fade = 1;

  const tint = s.g.createRadialGradient(box.x + box.w / 2, box.y + box.h / 2, Math.min(box.w, box.h) * 0.2, box.x + box.w / 2, box.y + box.h / 2, Math.max(box.w, box.h) * 0.7);

  tint.addColorStop(0, "rgba(160,215,255,0.14)");
  tint.addColorStop(1, "rgba(190,232,255,0.72)");

  const hide = show(s, (g) => {
    const a = Math.min(1, grow) * fade;

    g.globalAlpha = a;
    g.globalCompositeOperation = "source-over";
    roundRect(g, box);
    g.fillStyle = tint;
    g.fill();

    g.strokeStyle = "rgba(235,248,255,0.95)";
    g.shadowColor = "#8fdcff";
    g.shadowBlur = 5;
    g.lineCap = "round";
    g.lineWidth = 1.3;
    g.globalAlpha = fade;
    g.beginPath();

    for (const br of branches) {
      const p = clamp01((grow - br.delay) / 0.55);

      if (p <= 0) continue;

      g.moveTo(br.x, br.y);
      g.lineTo(br.x + Math.cos(br.angle) * br.length * p, br.y + Math.sin(br.angle) * br.length * p);
    }

    g.stroke();
    edgeGlow(g, box, { shadow: "#8fdcff", blur: 12 * a, stroke: `rgba(170,225,255,${0.9 * a})`, width: 2 });
    g.shadowBlur = 0;
    g.globalAlpha = 1;
  });

  await tween(s, GROW_MS, (v) => {
    grow = v * 1.1;
  });
  await tween(s, HOLD_MS, () => {
    if (Math.random() < 0.08) emit(s, { x: box.x + rand(0, box.w), y: box.y + rand(0, box.h) }, { tints: ["#ffffff", "#d8f3ff"], speed: [0, 4], life: [0.3, 0.6], scale: [0.18, 0.02] });
  });
  await tween(s, THAW_MS, (v) => {
    fade = 1 - v;

    if (Math.random() < 0.3) emit(s, bottomPoint(box, 4), { tints: ["#cfeeff", "#8fd3ff"], speed: [5, 15], angle: [Math.PI * 0.45, Math.PI * 0.55], life: [0.5, 0.8], scale: [0.1, 0.06], gravity: 260 });
  });
  hide();
};
