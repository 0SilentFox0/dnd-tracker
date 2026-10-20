import type { AuraAnimation } from "./types";

const LINKS = 14;

export const bindAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    const squeeze = Math.sin(t * 2.2);

    const R = r * (1.1 + squeeze * 0.05);

    const spin = Math.sin(t * 0.9) * 0.12;

    const step = (Math.PI * 2) / LINKS;

    g.globalCompositeOperation = "source-over";
    g.lineCap = "round";

    for (let i = 0; i < LINKS; i++) {
      const a = spin + i * step;

      const x = cx + Math.cos(a) * R;

      const y = cy + Math.sin(a) * R;

      const len = R * step * 0.72;

      g.save();
      g.translate(x, y);
      g.rotate(a + Math.PI / 2);

      if (i % 2 === 0) {
        g.beginPath();
        g.ellipse(0, 0, len, 2.6 * s, 0, 0, Math.PI * 2);
        g.lineWidth = 2.8 * s;
        g.strokeStyle = "#1b1d22";
        g.stroke();
        g.lineWidth = 1.6 * s;
        g.strokeStyle = "#a9adb6";
        g.stroke();
        g.lineWidth = 0.7 * s;
        g.strokeStyle = "#eef1f6";
        g.beginPath();
        g.ellipse(0, 0, len, 2.6 * s, 0, Math.PI * 1.1, Math.PI * 1.6);
        g.stroke();
      } else {
        g.beginPath();
        g.moveTo(-len, 0);
        g.lineTo(len, 0);
        g.lineWidth = 3.6 * s;
        g.strokeStyle = "#1b1d22";
        g.stroke();
        g.lineWidth = 2 * s;
        g.strokeStyle = "#8d929c";
        g.stroke();
      }

      g.restore();
    }

    // A faint strain glow when the chains bite.
    const bite = Math.max(0, squeeze);

    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.25 * bite;
    g.strokeStyle = "#d8dde6";
    g.lineWidth = 3 * s;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  },
};
