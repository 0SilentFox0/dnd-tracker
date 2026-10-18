import { clamp01, envelope } from "../../runtime/easing";
import { edgeGlow, type FrameBox, roundRect } from "../../runtime/frame-kit";
import { pick, rand } from "../../runtime/geometry";
import { leafPath } from "../../runtime/shapes";
import { show, tween } from "../../runtime/stage";
import type { FrameAnimation } from "./types";

interface Gust {
  y: number;
  delay: number;
  len: number;
  width: number;
  amp: number;
  phase: number;
  curl: boolean;
}

interface Speck {
  y: number;
  delay: number;
  size: number;
  spin: number;
  leaf: boolean;
  color: string;
}

const GUST_MS = 1200;

const SPECKS = ["#b8a070", "#8aa850", "#c8b888", "#6f9a3a"];

function gustY(g: Gust, box: FrameBox, x: number, t: number) {
  return g.y + Math.sin((x - box.x) / 22 + g.phase + t * 6) * g.amp;
}

// A gust that loops once on its way: the curl reads as wind rather than a plain line.
function curlOffset(g: Gust, u: number) {
  if (!g.curl || u < 0.45 || u > 0.75) return { dx: 0, dy: 0 };

  const a = ((u - 0.45) / 0.3) * Math.PI * 2;

  return { dx: Math.sin(a) * 9, dy: -(1 - Math.cos(a)) * 7 };
}

// Spans the gust from its tail at x = 0; translated along with the gust, so it is built once.
function gustGradient(g: CanvasRenderingContext2D, length: number) {
  const grad = g.createLinearGradient(0, 0, length, 0);

  grad.addColorStop(0, "rgba(220,250,255,0)");
  grad.addColorStop(0.7, "rgba(230,250,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0.95)");

  return grad;
}

export const windFrame: FrameAnimation = async (s, box) => {
  const gusts: Gust[] = Array.from({ length: 7 }, (_, i) => ({ y: box.y + box.h * ((i + 0.5) / 7) + rand(-4, 4), delay: rand(0, 0.25), len: rand(0.35, 0.6), width: rand(1.2, 2.6), amp: rand(1.5, 4), phase: rand(0, 6), curl: i % 3 === 1 }));

  const grads = gusts.map((gu) => gustGradient(s.g, box.w * gu.len));

  const specks: Speck[] = Array.from({ length: 9 }, () => ({ y: box.y + rand(6, box.h - 6), delay: rand(0, 0.3), size: rand(2.5, 4.5), spin: rand(8, 16), leaf: Math.random() < 0.5, color: pick(SPECKS) }));

  let k = 0;

  const hide = show(s, (g) => {
    const a = envelope(k, 0.12, 0.3);

    g.save();
    roundRect(g, box);
    g.clip();

    const tint = g.createLinearGradient(box.x, 0, box.x + box.w, 0);

    const sweep = k * 1.4 - 0.2;

    tint.addColorStop(clamp01(sweep - 0.25), "rgba(200,240,255,0)");
    tint.addColorStop(clamp01(sweep), `rgba(210,245,255,${0.28 * a})`);
    tint.addColorStop(clamp01(sweep + 0.2), "rgba(200,240,255,0)");
    g.fillStyle = tint;
    g.fillRect(box.x, box.y, box.w, box.h);

    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";

    gusts.forEach((gu, i) => {
      const u = (k - gu.delay) / (1 - gu.delay);

      if (u <= 0 || u >= 1) return;

      const headX = box.x - box.w * 0.2 + u * box.w * 1.6;

      const tailX = headX - box.w * gu.len;

      g.globalAlpha = Math.sin(u * Math.PI);
      g.lineWidth = gu.width;
      g.beginPath();

      for (let j = 0; j <= 16; j++) {
        const x = tailX + ((headX - tailX) * j) / 16;

        const c = curlOffset(gu, u - (1 - j / 16) * gu.len * 0.6);

        g.lineTo(x + c.dx, gustY(gu, box, x, k) + c.dy);
      }

      g.save();
      g.translate(tailX, 0);
      g.strokeStyle = grads[i];
      g.stroke();
      g.restore();
    });

    g.globalCompositeOperation = "source-over";

    for (const sp of specks) {
      const u = (k - sp.delay) / (1 - sp.delay);

      if (u <= 0 || u >= 1) continue;

      const x = box.x - 8 + u * (box.w + 16);

      const y = sp.y + Math.sin(u * 9 + sp.spin) * 5 - u * 6;

      g.save();
      g.translate(x, y);
      g.rotate(u * sp.spin);
      g.globalAlpha = Math.sin(u * Math.PI);
      g.fillStyle = sp.color;

      if (sp.leaf) leafPath(g, -sp.size * 1.3, sp.size * 1.3, sp.size);
      else {
        g.beginPath();
        g.arc(0, 0, sp.size * 0.45, 0, Math.PI * 2);
      }

      g.fill();
      g.restore();
    }

    g.restore();
    g.globalAlpha = 1;
    edgeGlow(g, box, { shadow: "#cff4ff", blur: 8 * a, stroke: `rgba(215,245,255,${0.75 * a})`, width: 1.6 });
    g.shadowBlur = 0;
  });

  await tween(s, GUST_MS, (v) => (k = v));
  hide();
};
