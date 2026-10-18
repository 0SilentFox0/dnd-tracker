import { emit, show, tween } from "../../runtime/canvas";
import { rand } from "../../runtime/geometry";
import { clamp01, type FrameAnimation, roundRect } from "./types";

const DEBRIS = ["#ffffff", "#ffd0b0", "#ff6a4d"];

const SLASH_MS = 900;

const CUT = 0.14;

export const physicalFrame: FrameAnimation = async (s, box) => {
  let k = 0;

  const flip = Math.random() < 0.5;

  const pad = Math.min(box.w, box.h) * 0.1;

  const from = { x: box.x + box.w * (flip ? 0.72 : 0.28), y: box.y + pad };

  const to = { x: box.x + box.w * (flip ? 0.28 : 0.72), y: box.y + box.h - pad };

  const dx = to.x - from.x;

  const dy = to.y - from.y;

  const len = Math.hypot(dx, dy);

  const nx = -dy / len;

  const ny = dx / len;

  const width = Math.min(9, box.h * 0.12);

  // Tapered crescent: thin at both tips, widest in the middle, revealed tip-first.
  const streak = (g: CanvasRenderingContext2D, reveal: number, w: number) => {
    const steps = 16;

    const pts: [number, number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * reveal;

      const bow = Math.sin(t * Math.PI) * len * 0.06;

      pts.push([from.x + dx * t + nx * bow, from.y + dy * t + ny * bow, Math.sin(t * Math.PI) * w]);
    }

    g.beginPath();

    for (const [x, y, h] of pts) g.lineTo(x + nx * h, y + ny * h);

    for (const [x, y, h] of pts.reverse()) g.lineTo(x - nx * h * 0.35, y - ny * h * 0.35);

    g.closePath();
    g.fill();
  };

  const hide = show(s, (g) => {
    const reveal = clamp01(k / CUT);

    const fadeCut = 1 - clamp01((k - CUT) / (1 - CUT));

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
    g.globalCompositeOperation = "lighter";
    g.shadowColor = "#ff3b2a";
    g.shadowBlur = 16;
    g.globalAlpha = fadeCut;
    g.fillStyle = "rgba(255,60,40,0.8)";
    streak(g, reveal, width * 1.8);
    g.shadowBlur = 6;
    g.shadowColor = "#ffffff";
    g.fillStyle = "#ffffff";
    streak(g, reveal, width);
    g.restore();
  });

  let emitted = 0;

  await tween(s, SLASH_MS, (v) => {
    k = v;

    const reveal = clamp01(v / CUT);

    while (emitted < reveal * 10) {
      const t = emitted / 10;

      emitted++;

      for (let i = 0; i < 3; i++) emit(s, { x: from.x + dx * t, y: from.y + dy * t }, { tints: DEBRIS, speed: [60, 170], angle: [Math.atan2(dy, dx) - 1.2, Math.atan2(dy, dx) + 1.2], life: [0.25, 0.55], scale: [rand(0.08, 0.14), 0.02], gravity: 320, drag: 1.5 });
    }
  });
  hide();
};
