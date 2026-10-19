import { halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { type FxPoint, rand } from "../runtime/geometry";
import { emit } from "../runtime/primitives";
import { animateEl, schedule, show, tween } from "../runtime/stage";
import { glow, sprite, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const GRAB_MS = IMPACT_MS.netherhands;

const TOTAL_MS = 2700;

const SINK_MS = 2050;

const STAGGER_MS = 130;

const CHILL = ["#d8fff4", "#a8e8dc", "#7ac8c0"];

const SHUDDER: Keyframe[] = [
  { transform: "none", filter: "none" },
  { transform: "translate(-3px,4px)", filter: "grayscale(.7) brightness(.72)", offset: 0.12 },
  { transform: "translate(3px,3px)", offset: 0.24 },
  { transform: "translate(-2px,4px)", offset: 0.36 },
  { transform: "translate(1px,3px)", filter: "grayscale(.7) brightness(.75)", offset: 0.7 },
  { transform: "none", filter: "none" },
];

interface Hand {
  x: number;
  size: number;
  lean: number;
  born: number;
}

interface Skull {
  x: number;
  born: number;
  sway: number;
  size: number;
}

// A pale ghostly hand reaching up from (0, 0); `curl` ∈ [0, 1] closes the fingers into a grip.
function hand(g: CanvasRenderingContext2D, size: number, curl: number) {
  g.beginPath();
  g.moveTo(-size * 0.22, 0);
  g.lineTo(-size * 0.26, -size * 0.55);
  g.lineTo(size * 0.26, -size * 0.55);
  g.lineTo(size * 0.22, 0);
  g.closePath();
  g.fill();

  for (let f = 0; f < 4; f++) {
    const x = -size * 0.2 + f * size * 0.135;

    const len = size * (f === 1 || f === 2 ? 0.42 : 0.34);

    g.save();
    g.translate(x, -size * 0.52);
    g.rotate((f - 1.5) * 0.12);
    g.beginPath();
    g.moveTo(-size * 0.05, 0);
    g.lineTo(-size * 0.04, -len * (1 - curl * 0.35));
    g.quadraticCurveTo(0, -len * (1 - curl * 0.35) - size * 0.06 - curl * size * 0.05, size * 0.04 + curl * size * 0.08, -len * (1 - curl * 0.55));
    g.lineTo(size * 0.05, 0);
    g.closePath();
    g.fill();
    g.restore();
  }

  g.save();
  g.translate(-size * 0.25, -size * 0.3);
  g.rotate(-0.9 + curl * 0.5);
  g.beginPath();
  g.ellipse(0, -size * 0.14, size * 0.06, size * 0.17, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function skull(g: CanvasRenderingContext2D, size: number) {
  g.fillStyle = "rgba(220,255,244,0.85)";
  g.beginPath();
  g.arc(0, -size * 0.1, size * 0.5, Math.PI * 0.85, Math.PI * 2.15);
  g.lineTo(size * 0.28, size * 0.42);
  g.lineTo(-size * 0.28, size * 0.42);
  g.closePath();
  g.fill();
  g.fillStyle = "#0c1a18";

  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(side * size * 0.2, 0, size * 0.13, size * 0.16, 0, 0, Math.PI * 2);
    g.fill();
  }

  g.beginPath();
  g.moveTo(0, size * 0.12);
  g.lineTo(-size * 0.07, size * 0.26);
  g.lineTo(size * 0.07, size * 0.26);
  g.closePath();
  g.fill();

  for (let n = -1; n <= 1; n++) g.fillRect(n * size * 0.12 - size * 0.025, size * 0.33, size * 0.05, size * 0.09);
}

export const netherhands: FxAnimation = ({ stage, to, targetEls }) => {
  const rows = to.map((p, i) => {
    const { w, h } = halfSize(targetEls[i]);

    const ground = p.y + h + 2;

    const crack: FxPoint[] = Array.from({ length: 11 }, (_, n) => ({ x: p.x + (n / 10 - 0.5) * w * 1.9, y: ground + rand(-2, 2) }));

    const hands: Hand[] = [-0.55, -0.05, 0.5].map((f, n) => ({ x: p.x + f * w + rand(-6, 6), size: Math.max(20, Math.min(34, h * 1.05)), lean: f * 0.5 + rand(-0.15, 0.15), born: 180 + n * 90 }));

    const skulls: Skull[] = [-0.3, 0.35].map((f, n) => ({ x: p.x + f * w, born: GRAB_MS + 150 + n * 260, sway: rand(0, 6), size: Math.max(13, Math.min(20, h * 0.6)) }));

    return { p, w, h, ground, crack, hands, skulls, delay: i * STAGGER_MS };
  });

  const rift = glow("#5ad8c0");

  let t = 0;

  const hide = show(stage, (g) => {
    for (const r of rows) {
      const local = t - r.delay;

      if (local <= 0) continue;

      const open = easeOutCubic(clamp01(local / 280)) * (1 - clamp01((local - SINK_MS - 200) / 350));

      // The ground splits under the foe, a grave-green glow leaking out.
      if (open > 0) {
        spritePx(g, rift, r.p.x, r.ground, r.w * 2.2, 26 * open, 0.6 * open);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
        g.fillStyle = "#040806";
        g.beginPath();
        r.crack.forEach((c, n) => g.lineTo(c.x, c.y - Math.sin((n / 10) * Math.PI) * 5 * open));
        [...r.crack].reverse().forEach((c, n) => g.lineTo(c.x, c.y + Math.sin(((10 - n) / 10) * Math.PI) * 4 * open));
        g.closePath();
        g.fill();
        g.strokeStyle = `rgba(140,255,220,${0.7 * open})`;
        g.lineWidth = 1;
        g.stroke();
      }

      // Pale hands claw up out of it and seize the living by the ankles.
      for (const hd of r.hands) {
        const k = local - hd.born;

        if (k <= 0) continue;

        const rise = easeOutCubic(clamp01(k / 380)) * (1 - easeOutCubic(clamp01((local - SINK_MS) / 400)));

        if (rise <= 0) continue;

        const curl = clamp01((local - GRAB_MS + 60) / 140);

        g.save();
        g.beginPath();
        g.rect(r.p.x - r.w * 2, r.ground - 200, r.w * 4, 200);
        g.clip();
        g.translate(hd.x, r.ground + hd.size * (1 - rise) * 1.1);
        g.rotate(hd.lean);
        spritePx(g, glow("#9af0dc"), 0, -hd.size * 0.5, hd.size * 1.6, hd.size * 2, 0.5);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 0.82;
        g.fillStyle = "#d8fff4";
        hand(g, hd.size, curl);
        g.restore();
      }

      // Skull spirits rise out of the rift and drift away, wailing.
      for (const sk of r.skulls) {
        const k = clamp01((local - sk.born) / 1100);

        if (k <= 0 || k >= 1) continue;

        const y = r.ground - easeOutCubic(k) * (r.h * 2 + 40);

        const x = sk.x + Math.sin(k * 6 + sk.sway) * 8;

        const a = Math.sin(k * Math.PI);

        g.globalCompositeOperation = "lighter";

        for (let n = 1; n <= 4; n++) sprite(g, glow("#7ad8c8"), x - Math.sin(k * 6 + sk.sway - n * 0.5) * 3, y + n * sk.size * 0.45, (sk.size * (1.1 - n * 0.18)) / 32, undefined, a * 0.35);

        g.save();
        g.translate(x, y);
        g.globalAlpha = a * 0.9;
        g.globalCompositeOperation = "source-over";
        skull(g, sk.size);
        g.restore();
      }
    }

    g.globalAlpha = 1;
  });

  rows.forEach((r, i) => {
    schedule(stage, r.delay + GRAB_MS, () => {
      if (targetEls[i]) void animateEl(stage, targetEls[i], SHUDDER, { duration: 1300, easing: "ease-out" });
    });
  });

  return tween(stage, TOTAL_MS, (k) => {
    t = k * TOTAL_MS;

    // Warmth and hope seeping out of the seized: pale cold motes rising off them.
    for (const r of rows) {
      const local = t - r.delay;

      if (local > GRAB_MS && local < SINK_MS && Math.random() < 0.5) emit(stage, { x: r.p.x + rand(-r.w * 0.8, r.w * 0.8), y: r.p.y + rand(-r.h * 0.4, r.h * 0.6) }, { tints: CHILL, speed: [15, 40], angle: [-Math.PI * 0.65, -Math.PI * 0.35], life: [0.6, 1], scale: [0.22, 0.05], gravity: -30 });
    }
  }).then(() => void hide());
};
