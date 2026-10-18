import { emit, show, tween } from "../../runtime/canvas";
import { rand } from "../../runtime/geometry";
import { clamp01, type FrameAnimation, type FrameBox, roundRect } from "./types";

const SPARKS = ["#ffffff", "#fff1c4", "#ffd27a", "#cfe3ff"];

const BLOOD = ["#ff6a4d", "#c8140f"];

const SLASH_MS = 900;

const CUT = 0.13;

const SECOND_AT = 0.12;

const DENT_END = 0.75;

const STREAK_END = 0.42;

interface Slash {
  from: { x: number; y: number };
  dx: number;
  dy: number;
  len: number;
  nx: number;
  ny: number;
  width: number;
  start: number;
}

function slashAcross(box: FrameBox, flip: boolean, inset: number, start: number): Slash {
  const pad = Math.min(box.w, box.h) * 0.1;

  const from = { x: box.x + box.w * (flip ? 1 - inset : inset), y: box.y + pad };

  const to = { x: box.x + box.w * (flip ? inset : 1 - inset), y: box.y + box.h - pad };

  const dx = to.x - from.x;

  const dy = to.y - from.y;

  const len = Math.hypot(dx, dy);

  return { from, dx, dy, len, nx: -dy / len, ny: dx / len, width: Math.min(9, box.h * 0.12), start };
}

// Tapered crescent: thin at both tips, widest in the middle, revealed tip-first.
function streak(g: CanvasRenderingContext2D, sl: Slash, reveal: number, w: number) {
  const steps = 16;

  const pts: [number, number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * reveal;

    const bow = Math.sin(t * Math.PI) * sl.len * 0.06;

    pts.push([sl.from.x + sl.dx * t + sl.nx * bow, sl.from.y + sl.dy * t + sl.ny * bow, Math.sin(t * Math.PI) * w]);
  }

  g.beginPath();

  for (const [x, y, h] of pts) g.lineTo(x + sl.nx * h, y + sl.ny * h);

  for (const [x, y, h] of pts.reverse()) g.lineTo(x - sl.nx * h * 0.35, y - sl.ny * h * 0.35);

  g.closePath();
  g.fill();
}

function dent(g: CanvasRenderingContext2D, sl: Slash, alpha: number) {
  const bowAt = (t: number) => Math.sin(t * Math.PI) * sl.len * 0.06;

  const line = (off: number) => {
    g.beginPath();

    for (let i = 2; i <= 14; i++) {
      const t = i / 16;

      g.lineTo(sl.from.x + sl.dx * t + sl.nx * (bowAt(t) + off), sl.from.y + sl.dy * t + sl.ny * (bowAt(t) + off));
    }

    g.stroke();
  };

  g.lineCap = "round";
  g.strokeStyle = `rgba(8,3,1,${0.8 * alpha})`;
  g.lineWidth = 3.5;
  line(0);
  g.strokeStyle = `rgba(255,200,170,${0.45 * alpha})`;
  g.lineWidth = 1.2;
  line(-2);
}

export const physicalMeleeFrame: FrameAnimation = async (s, box) => {
  let k = 0;

  const flip = Math.random() < 0.5;

  const slashes = [slashAcross(box, flip, 0.26, 0)];

  if (Math.random() < 0.6) slashes.push(slashAcross(box, !flip, 0.36, SECOND_AT));

  const hide = show(s, (g) => {
    const red = k < 0.05 ? k / 0.05 : clamp01(1 - (k - 0.05) / 0.4);

    g.save();
    roundRect(g, box);
    g.fillStyle = `rgba(200,20,15,${0.38 * red})`;
    g.fill();
    g.shadowColor = "#ff2a1a";
    g.shadowBlur = 14 * red;
    g.strokeStyle = `rgba(255,70,50,${0.9 * red})`;
    g.lineWidth = 2;
    roundRect(g, box);
    g.stroke();
    g.shadowBlur = 0;

    for (const sl of slashes) {
      const local = k - sl.start;

      if (local > CUT) dent(g, sl, clamp01(1 - (local - CUT) / (DENT_END - CUT)));
    }

    g.globalCompositeOperation = "lighter";

    for (const sl of slashes) {
      const local = k - sl.start;

      if (local <= 0) continue;

      const reveal = clamp01(local / CUT);

      g.globalAlpha = 1 - clamp01((local - CUT) / (STREAK_END - CUT));
      g.shadowColor = "#ff3b2a";
      g.shadowBlur = 16;
      g.fillStyle = "rgba(255,60,40,0.8)";
      streak(g, sl, reveal, sl.width * 1.8);
      g.shadowBlur = 6;
      g.shadowColor = "#ffffff";
      g.fillStyle = "#ffffff";
      streak(g, sl, reveal, sl.width);
    }

    g.restore();
  });

  const emitted = slashes.map(() => 0);

  await tween(s, SLASH_MS, (v) => {
    k = v;

    slashes.forEach((sl, i) => {
      const reveal = clamp01((v - sl.start) / CUT);

      const dir = Math.atan2(sl.dy, sl.dx);

      while (emitted[i] < reveal * 10) {
        const t = emitted[i] / 10;

        const at = { x: sl.from.x + sl.dx * t, y: sl.from.y + sl.dy * t };

        emitted[i]++;

        for (let j = 0; j < 4; j++) emit(s, at, { tints: SPARKS, speed: [130, 280], angle: [dir - 1.3, dir + 1.3], life: [0.22, 0.5], scale: [rand(0.07, 0.12), 0.015], gravity: 420, drag: 2 });

        if (t > 0.2 && t < 0.8 && Math.random() < 0.6) emit(s, at, { tints: BLOOD, speed: [40, 110], angle: [dir - 0.8, dir + 0.8], life: [0.3, 0.55], scale: [rand(0.1, 0.16), 0.03], gravity: 300, drag: 1.5 });
      }
    });
  });
  hide();
};
