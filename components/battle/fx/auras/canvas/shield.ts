import { type AuraAnimation } from "./types";

const SWEEP_S = 2.6;

export const shieldAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const R = r * 1.2;

    const shell = g.createRadialGradient(cx, cy, r * 0.75, cx, cy, R);

    shell.addColorStop(0, "rgba(90,160,255,0)");
    shell.addColorStop(0.75, "rgba(110,180,255,0.18)");
    shell.addColorStop(1, "rgba(150,210,255,0.5)");
    g.fillStyle = shell;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();

    g.globalCompositeOperation = "lighter";
    g.lineWidth = 1.4 * s;
    g.strokeStyle = "rgba(170,220,255,0.85)";
    g.stroke();

    // Hexagon facets hint at a ward rather than a plain ring.
    g.lineWidth = 0.8 * s;
    g.strokeStyle = "rgba(160,215,255,0.35)";
    g.beginPath();

    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + Math.PI / 6;

      g.moveTo(cx + Math.cos(a) * R * 0.93, cy + Math.sin(a) * R * 0.93);
      g.lineTo(cx + Math.cos(a + Math.PI / 3) * R * 0.93, cy + Math.sin(a + Math.PI / 3) * R * 0.93);
    }

    g.stroke();

    const k = (t % SWEEP_S) / SWEEP_S;

    const head = -Math.PI * 0.75 + k * Math.PI * 2;

    g.lineCap = "round";

    for (let i = 0; i < 8; i++) {
      g.globalAlpha = (1 - i / 8) * 0.9;
      g.strokeStyle = "#ffffff";
      g.lineWidth = (2.6 - i * 0.22) * s;
      g.beginPath();
      g.arc(cx, cy, R, head - (i + 1) * 0.1, head - i * 0.1);
      g.stroke();
    }

    g.globalAlpha = 1;
  },
};
