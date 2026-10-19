import type { AuraAnimation } from "./types";

// [orbit radius × r, angular speed, phase, jitter frequency]
const WASPS: [number, number, number, number][] = [[1.3, 2.6, 0, 7], [1.18, -3.1, 2.1, 9], [1.42, 2.2, 4.2, 6], [1.25, -2.4, 1, 8]];

function wasp(g: CanvasRenderingContext2D, x: number, y: number, heading: number, size: number, flap: number) {
  g.save();
  g.translate(x, y);
  g.rotate(heading);

  g.globalCompositeOperation = "lighter";
  g.fillStyle = `rgba(220,240,255,${0.35 + flap * 0.35})`;

  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(-size * 0.1, side * size * (0.45 + flap * 0.2), size * 0.55, size * (0.22 + flap * 0.12), side * 0.5, 0, Math.PI * 2);
    g.fill();
  }

  g.globalCompositeOperation = "source-over";
  g.fillStyle = "#1a1408";
  g.beginPath();
  g.ellipse(size * 0.65, 0, size * 0.32, size * 0.3, 0, 0, Math.PI * 2);
  g.fill();

  g.save();
  g.beginPath();
  g.ellipse(-size * 0.2, 0, size * 0.75, size * 0.36, 0, 0, Math.PI * 2);
  g.fillStyle = "#ffd21f";
  g.fill();
  g.clip();
  g.fillStyle = "#1a1408";

  for (const sx of [-0.65, -0.25, 0.15]) g.fillRect(-size * 0.2 + sx * size - size * 0.1, -size, size * 0.2, size * 2);

  g.restore();

  g.strokeStyle = "#1a1408";
  g.lineWidth = Math.max(0.6, size * 0.14);
  g.beginPath();
  g.moveTo(-size * 0.95, 0);
  g.lineTo(-size * 1.3, 0);
  g.stroke();
  g.restore();
}

export const stingsAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const size = 4.8 * s;

    for (const [orbit, speed, phase, jf] of WASPS) {
      const pos = (time: number) => {
        const a = phase + time * speed + Math.sin(time * jf + phase) * 0.35;

        const rad = r * (orbit + Math.sin(time * jf * 1.7 + phase) * 0.12);

        return { x: cx + Math.cos(a) * rad + Math.sin(time * 23 + phase) * 0.8 * s, y: cy - r * 0.1 + Math.sin(a) * rad * 0.85 + Math.cos(time * 19 + phase) * 0.8 * s };
      };

      const now = pos(t);

      const prev = pos(t - 0.03);

      const heading = Math.atan2(now.y - prev.y, now.x - prev.x);

      g.globalAlpha = 0.35;
      g.strokeStyle = "rgba(255,230,120,0.6)";
      g.lineWidth = 0.8 * s;
      g.setLineDash([1.5 * s, 2 * s]);
      g.beginPath();

      for (let i = 0; i <= 6; i++) {
        const p = pos(t - 0.035 * i);

        g.lineTo(p.x, p.y);
      }

      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      wasp(g, now.x, now.y, heading, size, 0.5 + Math.sin(t * 60 + phase) * 0.5);
    }
  },
};
