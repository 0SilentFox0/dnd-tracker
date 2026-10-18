import { glow, sprite } from "../../runtime/canvas";
import { type AuraAnimation } from "./types";

type P = [number, number];

// Cubic roots in r units from the portrait centre: start below, climb and curl over the lower half.
const ROOTS: { pts: [P, P, P, P]; width: number; leaves: number[] }[] = [
  { pts: [[-0.75, 1.55], [-1.5, 0.85], [-1.3, -0.25], [-0.6, 0.1]], width: 3.4, leaves: [0.55, 0.85] },
  { pts: [[0.8, 1.55], [1.55, 0.8], [1.25, -0.3], [0.55, 0.05]], width: 3.4, leaves: [0.6, 0.9] },
  { pts: [[-0.25, 1.6], [-0.9, 1.1], [0.2, 0.55], [0.85, 0.75]], width: 2.6, leaves: [0.7] },
  { pts: [[0.3, 1.6], [0.9, 1.15], [-0.1, 0.62], [-0.8, 0.82]], width: 2.4, leaves: [0.45] },
  { pts: [[-1.1, 1.5], [-1.6, 1.0], [-1.55, 0.35], [-1.15, 0.05]], width: 1.8, leaves: [0.8] },
];

function cubic(p: [P, P, P, P], k: number): P {
  const u = 1 - k;

  return [0, 1].map((i) => u * u * u * p[0][i] + 3 * u * u * k * p[1][i] + 3 * u * k * k * p[2][i] + k * k * k * p[3][i]) as P;
}

function leaf(g: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(size * 0.5, -size * 0.5, size, 0);
  g.quadraticCurveTo(size * 0.5, size * 0.5, 0, 0);
  g.fillStyle = "#5fae3a";
  g.fill();
  g.strokeStyle = "#2c5a18";
  g.lineWidth = size * 0.12;
  g.stroke();
  g.restore();
}

export const rootsAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const grow = Math.min(1, t / 0.9);

    g.globalCompositeOperation = "source-over";
    g.lineCap = "round";
    g.lineJoin = "round";

    sprite(g, glow("#4a3218"), cx, cy + r * 1.5, (r * 2.8) / 64, (r * 0.6) / 64, 0.9, false);
    g.globalAlpha = 1;

    ROOTS.forEach((root, ri) => {
      const sway = Math.sin(t * 1.3 + ri * 1.7) * 0.06;

      const pts = root.pts.map(([x, y], i) => [cx + (x + (i >= 2 ? sway : 0)) * r, cy + (y + (i === 3 ? sway * 0.5 : 0)) * r] as P) as [P, P, P, P];

      const steps = Math.max(2, Math.round(24 * grow));

      const line: P[] = Array.from({ length: steps + 1 }, (_, i) => cubic(pts, (i / steps) * grow));

      // Tapered: thick where the root leaves the ground, thin at the curling tip.
      const stroke = (width: number, color: string) => {
        g.strokeStyle = color;

        for (let i = 1; i < line.length; i++) {
          g.lineWidth = Math.max(0.6 * s, width * (1 - (i / line.length) * 0.7));
          g.beginPath();
          g.moveTo(line[i - 1][0], line[i - 1][1]);
          g.lineTo(line[i][0], line[i][1]);
          g.stroke();
        }
      };

      stroke((root.width + 1.8) * s, "#1f1408");
      stroke(root.width * s, "#7a5530");
      stroke(root.width * 0.3 * s, "#b88e58");

      for (const at of root.leaves) {
        if (at > grow) continue;

        const [x, y] = cubic(pts, at);

        const [x2, y2] = cubic(pts, Math.min(1, at + 0.05));

        const dir = Math.atan2(y2 - y, x2 - x);

        leaf(g, x, y, dir + (ri % 2 ? -1 : 1) * (0.9 + Math.sin(t * 2 + at * 9) * 0.15), 6.5 * s);
      }

      const tip = line[line.length - 1];

      g.fillStyle = "#8fd04a";
      g.beginPath();
      g.arc(tip[0], tip[1], 1.1 * s, 0, Math.PI * 2);
      g.fill();
    });
  },
};
