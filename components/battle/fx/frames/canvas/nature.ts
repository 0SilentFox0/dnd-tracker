import { rand } from "../../runtime/geometry";
import { emit } from "../../runtime/primitives";
import { show, tween } from "../../runtime/stage";
import { clamp01, type FrameAnimation, perimeter, roundRect } from "./types";

interface Leaf {
  t: number;
  speed: number;
  lift: number;
  phase: number;
  size: number;
  color: string;
  spin: number;
}

const LEAF = ["#9acd32", "#6fbf3a", "#c8e04a", "#4f9a2a"];

const SPECK = ["#f2ff8a", "#c6f25a", "#ffe26a"];

const SWIRL_MS = 1500;

function drawLeaf(g: CanvasRenderingContext2D, size: number) {
  g.beginPath();
  g.moveTo(-size, 0);
  g.quadraticCurveTo(0, -size * 0.75, size, 0);
  g.quadraticCurveTo(0, size * 0.75, -size, 0);
  g.fill();
  g.beginPath();
  g.moveTo(-size * 0.9, 0);
  g.lineTo(size * 0.8, 0);
  g.stroke();
}

export const natureFrame: FrameAnimation = async (s, box) => {
  let k = 0;

  const leaves: Leaf[] = Array.from({ length: 22 }, () => ({ t: Math.random(), speed: rand(0.18, 0.32), lift: rand(2, 10), phase: rand(0, Math.PI * 2), size: rand(4.5, 7.5), color: LEAF[Math.floor(Math.random() * LEAF.length)], spin: rand(-3, 3) }));

  const hide = show(s, (g) => {
    const a = clamp01(k / 0.15) * clamp01((1 - k) / 0.3);

    g.save();

    const fill = g.createLinearGradient(0, box.y + box.h, 0, box.y);

    fill.addColorStop(0, `rgba(120,190,40,${0.3 * a})`);
    fill.addColorStop(1, `rgba(120,190,40,${0.05 * a})`);
    roundRect(g, box);
    g.fillStyle = fill;
    g.fill();
    g.shadowColor = "#9be03a";
    g.shadowBlur = 10 * a;
    g.strokeStyle = `rgba(170,225,80,${0.7 * a})`;
    g.lineWidth = 1.8;
    roundRect(g, box);
    g.stroke();
    g.shadowBlur = 0;
    g.globalAlpha = a;
    g.strokeStyle = "rgba(40,70,15,0.8)";
    g.lineWidth = 0.7;

    for (const l of leaves) {
      const p = perimeter(box, l.t + l.speed * k);

      const off = l.lift + Math.sin(k * 10 + l.phase) * 5;

      g.save();
      g.translate(p.x + p.nx * off, p.y + p.ny * off);
      g.rotate(Math.atan2(p.nx, -p.ny) + Math.sin(k * 8 + l.phase) * 0.8 + l.spin * k);
      g.fillStyle = l.color;
      drawLeaf(g, l.size);
      g.restore();
    }

    g.restore();
  });

  await tween(s, SWIRL_MS, (v) => {
    k = v;

    if (v < 0.8 && Math.random() < 0.6) {
      const p = perimeter(box, Math.random());

      emit(s, { x: p.x + p.nx * rand(0, 12), y: p.y + p.ny * rand(0, 12) }, { tints: SPECK, speed: [15, 45], life: [0.4, 0.8], scale: [0.09, 0.03], drag: 1 });
    }
  });
  hide();
};
