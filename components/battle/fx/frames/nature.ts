import type { FrameAnimation } from "./types";

import { edgeGlow, emitOnPerimeter, perimeter, verticalFill } from "@/components/battle/fx/frames/kit";
import { envelope } from "@/components/battle/fx/runtime/easing";
import { chance, rand } from "@/components/battle/fx/runtime/geometry";
import { leafPath } from "@/components/battle/fx/runtime/shapes";
import { progress } from "@/components/battle/fx/runtime/stage";

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
  leafPath(g, -size, size, size * 0.75);
  g.fill();
  g.beginPath();
  g.moveTo(-size * 0.9, 0);
  g.lineTo(size * 0.8, 0);
  g.stroke();
}

export const natureFrame: FrameAnimation = async (s, box) => {
  const leaves: Leaf[] = Array.from({ length: 22 }, () => ({ t: Math.random(), speed: rand(0.18, 0.32), lift: rand(2, 10), phase: rand(0, Math.PI * 2), size: rand(4.5, 7.5), color: LEAF[Math.floor(Math.random() * LEAF.length)], spin: rand(-3, 3) }));

  const fill = verticalFill(s.g, box, [[0, "rgba(120,190,40,0.3)"], [1, "rgba(120,190,40,0.05)"]]);

  await progress(s, SWIRL_MS, (g, k) => {
    const a = envelope(k, 0.15, 0.3);

    g.save();
    edgeGlow(g, box, { fill, fillAlpha: a, shadow: "#9be03a", blur: 10 * a, stroke: `rgba(170,225,80,${0.7 * a})`, width: 1.8 });
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
  }, (v, dt) => {
    if (v < 0.8 && chance(0.6, dt)) emitOnPerimeter(s, box, { tints: SPECK, speed: [15, 45], life: [0.4, 0.8], scale: [0.09, 0.03], drag: 1 }, { offset: [0, 12] });
  });
};
