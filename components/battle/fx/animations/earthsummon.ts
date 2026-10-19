import { clamp01, easeOutCubic } from "../runtime/easing";
import { figurePath, summonSpot } from "../runtime/figure";
import { type FxPoint, rand } from "../runtime/geometry";
import { emit, flash, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { jaggedShape, polyPath } from "../runtime/shapes";
import { animateEl, schedule, show, tween } from "../runtime/stage";
import { glow, spritePx } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const BURST_MS = 300;

const ASSEMBLE_MS = IMPACT_MS.earthsummon;

const LOCKED_MS = 1350;

const TOTAL_MS = 2600;

const BULK = 1.45;

const DUST = ["#c8a26a", "#a08058", "#8a6a48"];

const MAGMA = ["#fff0a0", "#ffb040", "#ff6a10"];

// Where each boulder sits in the giant: [x, y, size] as fractions of the height.
const SLOTS: [number, number, number][] = [
  [-0.12, -0.1, 0.1],
  [0.12, -0.1, 0.1],
  [-0.1, -0.3, 0.11],
  [0.1, -0.3, 0.11],
  [0, -0.47, 0.15],
  [-0.14, -0.64, 0.12],
  [0.14, -0.64, 0.12],
  [0, -0.68, 0.13],
  [-0.3, -0.72, 0.11],
  [0.3, -0.72, 0.11],
  [-0.36, -0.53, 0.095],
  [0.36, -0.53, 0.095],
  [-0.38, -0.37, 0.095],
  [0.38, -0.37, 0.095],
  [0, -0.87, 0.105],
];

const HEAD = SLOTS.length - 1;

const SHAKE: Keyframe[] = [{ transform: "none" }, { transform: "translateY(3px)", offset: 0.15 }, { transform: "translate(-2px,-1px)", offset: 0.35 }, { transform: "translate(1px,1px)", offset: 0.6 }, { transform: "none" }];

interface Boulder {
  shape: FxPoint[];
  slot: FxPoint;
  /** Where the eruption throws it before it is pulled into place. */
  air: FxPoint;
  spin: number;
  arrive: number;
  size: number;
}

function boulder(g: CanvasRenderingContext2D, b: Boulder) {
  const grad = g.createLinearGradient(-b.size, -b.size, b.size, b.size);

  grad.addColorStop(0, "#a8845a");
  grad.addColorStop(0.55, "#6e5236");
  grad.addColorStop(1, "#3e2c1a");
  polyPath(g, b.shape);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "#1e140a";
  g.lineWidth = Math.max(0.8, b.size * 0.12);
  g.stroke();
  g.strokeStyle = "rgba(230,205,160,0.5)";
  g.lineWidth = Math.max(0.6, b.size * 0.08);
  g.beginPath();
  g.moveTo(b.shape[4].x * 0.8, b.shape[4].y * 0.8);
  g.lineTo(b.shape[5].x * 0.8, b.shape[5].y * 0.8);
  g.lineTo(b.shape[6].x * 0.8, b.shape[6].y * 0.8);
  g.stroke();
}

export const earthsummon: FxAnimation = ({ stage, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { x, ground, height: H } = summonSpot(el, target);

    const crack: FxPoint[] = Array.from({ length: 9 }, (_, n) => ({ x: x + (n / 8 - 0.5) * H * 0.9, y: ground + rand(-1.5, 1.5) }));

    const boulders: Boulder[] = SLOTS.map(([sx, sy, size], n) => ({
      shape: jaggedShape(7, size * H, 0.3, 0.78),
      slot: { x: sx * H * BULK * 0.75, y: sy * H },
      air: { x: rand(-0.5, 0.5) * H, y: -rand(0.3, 1.05) * H },
      spin: rand(-6, 6),
      arrive: ASSEMBLE_MS + (n / SLOTS.length) * (LOCKED_MS - ASSEMBLE_MS - 120),
      size: size * H,
    }));

    let t = 0;

    const hide = show(stage, (g) => {
      const fade = 1 - clamp01((t - TOTAL_MS + 450) / 450);

      // The ground splits open with a glow of magma deep below.
      const open = easeOutCubic(clamp01(t / BURST_MS)) * (1 - clamp01((t - LOCKED_MS) / 600));

      if (open > 0) {
        spritePx(g, glow("#ff6a10"), x, ground, H * 1.1, 18 * open, 0.7 * open);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
        g.fillStyle = "#120a04";
        g.beginPath();
        crack.forEach((c, n) => g.lineTo(c.x, c.y - Math.sin((n / 8) * Math.PI) * 4 * open));
        [...crack].reverse().forEach((c, n) => g.lineTo(c.x, c.y + Math.sin(((8 - n) / 8) * Math.PI) * 3 * open));
        g.closePath();
        g.fill();
      }

      const locked = clamp01((t - LOCKED_MS) / 250);

      g.save();
      g.translate(x, ground);

      // Magma glowing through the seams of the assembled giant.
      if (locked > 0) {
        const heat = locked * fade * (0.8 + Math.sin(t / 140) * 0.2);

        spritePx(g, glow("#ff5a10"), 0, -H * 0.5, H * 1.3, H * 1.3, 0.5 * heat);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = heat;
        g.fillStyle = "#e0480c";
        g.save();
        g.scale(0.92, 0.98);
        figurePath(g, H, { bulk: BULK, armLift: 0.1 });
        g.restore();
        g.fill();
      }

      g.globalCompositeOperation = "source-over";

      for (const b of boulders) {
        // Thrown up by the burst, hanging, then pulled into its place.
        const up = easeOutCubic(clamp01((t - BURST_MS) / 380));

        if (up <= 0) continue;

        const pull = clamp01((t - (b.arrive - 260)) / 260);

        const e = pull * pull * (3 - 2 * pull);

        const airX = b.air.x * up;

        const airY = b.air.y * up + Math.sin(t / 200 + b.spin) * 3 * (1 - pull);

        const px = airX + (b.slot.x - airX) * e;

        const py = airY + (b.slot.y - airY) * e;

        g.save();
        g.translate(px, py);
        g.rotate(b.spin * (1 - e) * 0.4 + (t / 1000) * b.spin * (1 - e));
        g.globalAlpha = fade;
        boulder(g, b);
        g.restore();
      }

      // Eyes of red-hot stone.
      if (locked > 0) {
        const head = boulders[HEAD].slot;

        for (const side of [-1, 1]) {
          spritePx(g, glow("#ff8a1f"), head.x + side * H * 0.035, head.y + H * 0.01, H * 0.09, undefined, locked * fade);
          spritePx(g, glow("#fff0a0"), head.x + side * H * 0.035, head.y + H * 0.01, H * 0.035, undefined, locked * fade);
        }
      }

      g.restore();
      g.globalAlpha = 1;
    });

    schedule(stage, BURST_MS, () => {
      void flash(stage, { x, y: ground }, "#ff8a1f", H, 380);

      for (let n = 0; n < 20; n++) emit(stage, { x: x + rand(-H * 0.4, H * 0.4), y: ground }, { tints: DUST, speed: [20, 90], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.6, 1.1], scale: [0.45, 0.9], drag: 2, additive: false, alpha: 0.45 });

      if (el) void animateEl(stage, el, SHAKE, { duration: 380 });
    });

    // The last boulder slams home: the giant stands, the ground shudders.
    schedule(stage, LOCKED_MS, () => {
      void ring(stage, { x, y: ground }, "#c8a26a", 700, H * 0.8, 3, 0.22);

      for (let n = 0; n < 22; n++) emit(stage, { x: x + rand(-H * 0.35, H * 0.35), y: ground }, { tints: DUST, speed: [30, 110], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.6, 1], scale: [0.4, 0.9], drag: 2.2, additive: false, alpha: 0.55 });

      for (let n = 0; n < 12; n++) emit(stage, { x: x + rand(-H * 0.2, H * 0.2), y: ground - rand(H * 0.2, H * 0.8) }, { tints: MAGMA, speed: [30, 90], life: [0.3, 0.6], scale: [0.25, 0.04], gravity: 200 });

      if (el) void animateEl(stage, el, SHAKE, { duration: 420 });
    });

    await tween(stage, TOTAL_MS, (k) => {
      t = k * TOTAL_MS;

      // Grit trickling off the stone body.
      if (t > LOCKED_MS && t < TOTAL_MS - 300 && Math.random() < 0.35) emit(stage, { x: x + rand(-H * 0.3, H * 0.3), y: ground - rand(H * 0.3, H * 0.8) }, { tints: DUST, speed: [5, 20], angle: [Math.PI * 0.4, Math.PI * 0.6], life: [0.5, 0.8], scale: [0.18, 0.08], gravity: 220, additive: false, alpha: 0.8 });
    }).then(() => void hide());
  });
