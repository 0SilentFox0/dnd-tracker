import { emit, show, tween } from "../../runtime/canvas";
import type { FxPoint } from "../../runtime/geometry";
import { rand } from "../../runtime/geometry";
import { type FrameAnimation, type FrameBox, perimeter, roundRect } from "./types";

const SPARK = ["#ffffff", "#d6f0ff", "#7fd0ff"];

const CRACKLE_MS = 1100;

const FADE_MS = 300;

// A bolt hugs the border: jagged steps along the edge, jittered sideways, with an occasional fork inward.
function bolt(b: FrameBox): FxPoint[][] {
  const start = Math.random();

  const span = rand(60, 130) / (2 * (b.w + b.h));

  const steps = 9;

  const main: FxPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const p = perimeter(b, start + (span * i) / steps);

    const off = i === 0 || i === steps ? 0 : rand(-6, 6);

    main.push({ x: p.x + p.nx * off + (p.ny ? rand(-3, 3) : 0), y: p.y + p.ny * off + (p.nx ? rand(-3, 3) : 0) });
  }

  const forkAt = perimeter(b, start + span * rand(0.3, 0.7));

  const fork: FxPoint[] = [{ x: forkAt.x, y: forkAt.y }];

  const depth = rand(10, Math.min(b.h, b.w) * 0.45);

  for (let i = 1; i <= 4; i++) {
    const d = (depth * i) / 4;

    fork.push({ x: forkAt.x + forkAt.nx * d + rand(-5, 5), y: forkAt.y + forkAt.ny * d + rand(-5, 5) });
  }

  return [main, fork];
}

function stroke(g: CanvasRenderingContext2D, path: FxPoint[]) {
  g.beginPath();
  g.moveTo(path[0].x, path[0].y);

  for (const p of path.slice(1)) g.lineTo(p.x, p.y);

  g.stroke();
}

export const lightningFrame: FrameAnimation = async (s, box) => {
  let bolts: FxPoint[][] = [];

  let flicker = 0;

  let fade = 1;

  let next = 0;

  const hide = show(s, (g) => {
    g.save();
    g.globalCompositeOperation = "lighter";
    roundRect(g, box);
    g.fillStyle = `rgba(170,215,255,${0.38 * flicker * fade})`;
    g.fill();
    g.shadowColor = "#7fd0ff";
    g.shadowBlur = 10 + 10 * flicker;
    g.strokeStyle = `rgba(150,215,255,${(0.55 + 0.45 * flicker) * fade})`;
    g.lineWidth = 1.5;
    roundRect(g, box);
    g.stroke();
    g.lineCap = "round";
    g.lineJoin = "round";

    for (const path of bolts) {
      g.globalAlpha = fade;
      g.strokeStyle = "rgba(90,170,255,0.8)";
      g.lineWidth = 5;
      stroke(g, path);
      g.strokeStyle = "#ffffff";
      g.lineWidth = 1.4;
      stroke(g, path);
    }

    g.restore();
  });

  await tween(s, CRACKLE_MS, (v) => {
    const t = v * CRACKLE_MS;

    flicker *= 0.82;

    if (t < next) return;

    next = t + rand(45, 90);
    bolts = [];

    const count = v < 0.75 ? 3 + Math.round(Math.random()) : 2;

    for (let i = 0; i < count; i++) {
      const [main, fork] = bolt(box);

      bolts.push(main);

      if (Math.random() < 0.6) bolts.push(fork);

      const tip = main[main.length - 1];

      for (let j = 0; j < 4; j++) emit(s, tip, { tints: SPARK, speed: [40, 130], life: [0.15, 0.35], scale: [0.14, 0.02], drag: 2 });
    }

    flicker = Math.max(flicker, v < 0.2 ? 1 : rand(0.3, 0.8));
  });
  bolts = [];
  await tween(s, FADE_MS, (v) => {
    fade = 1 - v;
    flicker *= 0.8;
  });
  hide();
};
