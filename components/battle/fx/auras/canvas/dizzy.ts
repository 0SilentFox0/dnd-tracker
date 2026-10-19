import { glow, spritePx } from "../../runtime/texture";
import type { AuraAnimation } from "./types";

// [tilt, rx × r, ry × r, angular speed, phase, colour]
const VOICES: [number, number, number, number, number, string][] = [[0.45, 1.35, 0.42, 3.2, 0, "#c8b0ff"], [-0.5, 1.25, 0.38, -2.6, 2, "#9ae6e0"]];

const MARK_S = 2.6;

export const dizzyAura: AuraAnimation = {
  frame(g, ctx, t) {
    const { cx, cy, r, s } = ctx;

    for (const [tilt, rx, ry, speed, phase, tint] of VOICES) {
      for (let n = 6; n >= 0; n--) {
        const a = phase + (t - n * 0.035) * speed;

        const x = Math.cos(a) * rx * r;

        const y = Math.sin(a) * ry * r;

        spritePx(g, glow(tint), cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy - r * 0.15 + x * Math.sin(tilt) + y * Math.cos(tilt), (9 - n) * s, undefined, (1 - n / 7) * 0.9);
      }
    }

    // A spiral turning slowly over the head.
    g.save();
    g.translate(cx, cy - r * 1.35);
    g.rotate(-t * 2.4);
    g.scale(1, 0.55);
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.85;
    g.strokeStyle = "#c8a8ff";
    g.lineWidth = 1.6 * s;
    g.lineCap = "round";
    g.beginPath();

    for (let n = 0; n <= 32; n++) {
      const a = (n / 32) * Math.PI * 4.5;

      g.lineTo(Math.cos(a) * (n / 32) * r * 0.6, Math.sin(a) * (n / 32) * r * 0.6);
    }

    g.stroke();
    g.restore();

    const k = (t / MARK_S) % 1;

    if (k < 0.35) {
      const side = Math.floor(t / MARK_S) % 2 ? 1 : -1;

      g.globalCompositeOperation = "source-over";
      g.globalAlpha = Math.sin((k / 0.35) * Math.PI);
      g.fillStyle = "#e8dcff";
      g.font = `700 ${Math.round(r * 0.7)}px Georgia, serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("?", cx + side * r * 1.3, cy - r * 0.9 - k * r * 0.5);
      g.globalAlpha = 1;
    }
  },
};
