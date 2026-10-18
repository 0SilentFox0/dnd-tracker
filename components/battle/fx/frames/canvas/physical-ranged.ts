import { clamp01, fadeOut, pulse } from "../../runtime/easing";
import { bloodFlash } from "../../runtime/frame-kit";
import { rand } from "../../runtime/geometry";
import { emit, ring } from "../../runtime/primitives";
import { show, tween } from "../../runtime/stage";
import type { FrameAnimation } from "./types";

const SPLINTERS = ["#c89a5a", "#8a5a2b", "#e8d2a8"];

const DUST = ["#6b5a44", "#4a3c2c"];

const FLIGHT_MS = 140;

const STUCK_MS = 1260;

const QUIVER = 0.3 / 1.26;

const FADE_FROM = 0.78;

const ANGLE = 0.2;

interface ArrowPose {
  tipX: number;
  tipY: number;
  len: number;
  bend: number;
  alpha: number;
  scale: number;
}

// Local frame: tip at the origin, shaft running back along -x; `bend` sways the tail sideways.
function drawArrow(g: CanvasRenderingContext2D, p: ArrowPose) {
  const L = p.len;

  const off = (d: number) => p.bend * (d / L) ** 2;

  g.save();
  g.translate(p.tipX, p.tipY);
  g.rotate(ANGLE);
  g.scale(p.scale, p.scale);
  g.globalAlpha = p.alpha;
  g.lineCap = "round";

  const shaft = (dx: number, dy: number, color: string, width: number) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();

    for (let i = 0; i <= 8; i++) {
      const d = 4 + ((L - 4) * i) / 8;

      g.lineTo(-d + dx, off(d) + dy);
    }

    g.stroke();
  };

  shaft(2, 3, "rgba(0,0,0,0.45)", 3.4);
  shaft(0, 0, "#3a220e", 3.6);
  shaft(0, 0, "#9a6430", 2.2);
  shaft(0, -0.6, "rgba(255,220,170,0.55)", 0.8);

  const tail = (d: number) => ({ x: -d, y: off(d) });

  for (const side of [-1, 1]) {
    const a = tail(L - 3);

    const b = tail(L - 17);

    g.fillStyle = side < 0 ? "#f2ead8" : "#d8cbb0";
    g.strokeStyle = "#7a1d14";
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(a.x - 3, a.y + side * 6.5);
    g.lineTo(b.x + 2, b.y + side * 5);
    g.lineTo(b.x, b.y);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#b8281c";
    g.beginPath();
    g.moveTo(a.x - 1.5, a.y);
    g.lineTo(a.x - 3.6, a.y + side * 6.4);
    g.lineTo(a.x - 6, a.y + side * 6);
    g.lineTo(a.x - 4, a.y);
    g.closePath();
    g.fill();
  }

  const nock = tail(L);

  g.fillStyle = "#2a180a";
  g.fillRect(nock.x - 1, nock.y - 1.6, 3, 3.2);

  g.fillStyle = "#1c1c20";
  g.beginPath();
  g.moveTo(2, 0);
  g.lineTo(-5, -3.6);
  g.lineTo(-4, 0);
  g.lineTo(-5, 3.6);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(200,210,225,0.7)";
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(1.5, -0.2);
  g.lineTo(-4.6, -3.2);
  g.stroke();
  g.restore();
}

export const physicalRangedFrame: FrameAnimation = async (s, box) => {
  const tip = { x: box.x + box.w * 0.3, y: box.y + box.h * 0.55 };

  const scale = Math.max(0.9, Math.min(1.4, box.h / 55));

  const len = Math.min(66, (box.w * 0.3) / scale, (box.h * 1.1) / scale);

  const reach = len * scale;

  const ux = Math.cos(ANGLE);

  const uy = Math.sin(ANGLE);

  const travel = tip.x - box.x + reach + 40;

  const cracks = Array.from({ length: 5 }, (_, i) => [(i / 5) * Math.PI * 2 + rand(-0.3, 0.3), rand(7, 12)] as const);

  let flight = 0;

  let k = -1;

  const hide = show(s, (g) => {
    if (k < 0) {
      const back = (1 - flight) * travel;

      const x = tip.x - ux * back;

      const y = tip.y - uy * back;

      g.save();
      g.globalCompositeOperation = "lighter";

      const trail = g.createLinearGradient(x - ux * reach * 2.2, y - uy * reach * 2.2, x - ux * reach, y - uy * reach);

      trail.addColorStop(0, "rgba(255,240,210,0)");
      trail.addColorStop(1, "rgba(255,240,210,0.6)");
      g.strokeStyle = trail;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - ux * reach * 2.2, y - uy * reach * 2.2);
      g.lineTo(x - ux * reach, y - uy * reach);
      g.stroke();
      g.restore();
      drawArrow(g, { tipX: x, tipY: y, len, bend: 0, alpha: 1, scale });

      return;
    }

    g.save();
    bloodFlash(g, box, pulse(k, 0.04, 0.3), { fill: 0.3, blur: 12, stroke: 0.85 });
    g.restore();

    const fade = fadeOut(k, FADE_FROM);

    const hole = g.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 9);

    hole.addColorStop(0, `rgba(0,0,0,${0.75 * fade})`);
    hole.addColorStop(0.5, `rgba(40,10,5,${0.45 * fade})`);
    hole.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = hole;
    g.beginPath();
    g.ellipse(tip.x, tip.y, 9, 6, ANGLE, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = `rgba(12,6,3,${0.8 * fade})`;
    g.lineWidth = 1.2;
    g.lineCap = "round";

    for (const [a, r] of cracks) {
      g.beginPath();
      g.moveTo(tip.x + Math.cos(a) * 3, tip.y + Math.sin(a) * 3);
      g.lineTo(tip.x + Math.cos(a + 0.25) * r * 0.55, tip.y + Math.sin(a + 0.25) * r * 0.55);
      g.lineTo(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r);
      g.stroke();
    }

    const q = clamp01(k / QUIVER);

    const bend = q < 1 ? Math.sin(q * Math.PI * 6) * 10 * (1 - q) : 0;

    drawArrow(g, { tipX: tip.x, tipY: tip.y, len, bend, alpha: fade, scale });
  });

  await tween(s, FLIGHT_MS, (v) => {
    flight = v ** 0.8;
  });
  k = 0;
  void ring(s, tip, "#ffe2b0", 320, 12, 2);

  for (let i = 0; i < 14; i++) emit(s, tip, { tints: SPLINTERS, speed: [70, 200], angle: [Math.PI + ANGLE - 1.1, Math.PI + ANGLE + 1.1], life: [0.3, 0.6], scale: [rand(0.06, 0.11), 0.02], gravity: 380, drag: 1.8, additive: false });

  for (let i = 0; i < 8; i++) emit(s, tip, { tints: DUST, speed: [15, 45], life: [0.5, 0.9], scale: [rand(0.3, 0.45), 0.6], drag: 1.2, gravity: -10, additive: false, alpha: 0.5 });

  await tween(s, STUCK_MS, (v) => {
    k = v;
  });
  hide();
};
