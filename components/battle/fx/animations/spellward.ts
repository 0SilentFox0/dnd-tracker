import { halfSize } from "../runtime/anchors";
import { clamp01 } from "../runtime/easing";
import { chance, farSide, type FxPoint, pick, rand } from "../runtime/geometry";
import { emit, flash } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { hexPath } from "../runtime/shapes";
import { show, tween } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const FORM_MS = ARCHETYPE_FX.spellward.impactMs;

const TOTAL_MS = 2500;

const CELL = 9;

const FLIGHT_MS = 260;

const HOSTILE = [
  { at: FORM_MS + 60, tint: "#b04dff" },
  { at: FORM_MS + 300, tint: "#ff6a2a" },
  { at: FORM_MS + 520, tint: "#8fe04a" },
  { at: FORM_MS + 780, tint: "#6fd3ff" },
];

const DUST = ["#ffffff", "#e8f4ff", "#ffe8ff", "#fff6c8"];

interface Cell {
  x: number;
  y: number;
  angle: number;
  born: number;
  hit: number;
}

// A honeycomb shell: only the cells near the dome's outline, born round it from the bottom up.
function cells(rx: number, ry: number): Cell[] {
  const out: Cell[] = [];

  const dx = Math.sqrt(3) * CELL;

  const dy = CELL * 1.5;

  for (let row = -Math.ceil(ry / dy) - 1; row <= Math.ceil(ry / dy) + 1; row++) {
    for (let col = -Math.ceil(rx / dx) - 1; col <= Math.ceil(rx / dx) + 1; col++) {
      const x = col * dx + (row % 2 ? dx / 2 : 0);

      const y = row * dy;

      const d = Math.hypot(x / rx, y / ry);

      if (d < 0.78 || d > 1.06) continue;

      const angle = Math.atan2(y / ry, x / rx);

      // Bottom (π/2) first, the crown (−π/2) last.
      const fromBottom = Math.abs(Math.atan2(Math.sin(angle - Math.PI / 2), Math.cos(angle - Math.PI / 2))) / Math.PI;

      out.push({ x, y, angle, born: fromBottom * (FORM_MS - 180), hit: -1e9 });
    }
  }

  return out;
}

export const spellward: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const { w, h } = halfSize(targetEls[i]);

    const rx = w + 16;

    const ry = h + 20;

    const grid = cells(rx, ry);

    const dir = farSide(target, from, stage.layer.clientWidth);

    const orbs = HOSTILE.map((o, n) => {
      const a = (dir > 0 ? 0 : Math.PI) + [-0.55, 0.35, -0.15, 0.7][n] * dir;

      const hit = { x: target.x + Math.cos(a) * rx, y: target.y + Math.sin(a) * ry };

      return { ...o, hit, start: { x: hit.x + dir * 200, y: hit.y + rand(-40, 20) } as FxPoint, done: false };
    });

    const core = glow("#e8f4ff");

    let t = 0;

    const hide = show(stage, (g) => {
      const life = 1 - clamp01((t - TOTAL_MS + 450) / 450);

      sprite(g, core, target.x, target.y, (rx * 2.2) / 64, (ry * 2.2) / 64, 0.18 * life * clamp01(t / FORM_MS));

      g.save();
      g.translate(target.x, target.y);
      g.globalCompositeOperation = "lighter";
      g.beginPath();
      g.ellipse(0, 0, rx * 1.02, ry * 1.02, 0, 0, Math.PI * 2);
      g.globalAlpha = 0.35 * life * clamp01((t - FORM_MS + 150) / 300);
      g.strokeStyle = "#ffffff";
      g.lineWidth = 1.5;
      g.stroke();

      for (const c of grid) {
        const k = clamp01((t - c.born) / 200);

        if (k <= 0) continue;

        const struck = Math.max(0, 1 - (t - c.hit) / 500);

        // Rainbow waves rolling over the crystal.
        const hue = ((c.angle * 180) / Math.PI + t * 0.25 + 360) % 360;

        const pop = 1 - (1 - k) * 0.4;

        g.globalAlpha = life * Math.min(1, k * 2) * (0.55 + struck * 0.45);
        hexPath(g, c.x, c.y, CELL * 0.92 * pop);
        g.fillStyle = struck > 0 ? `rgba(255,255,255,${0.15 + struck * 0.6})` : "rgba(220,240,255,0.08)";
        g.fill();
        g.strokeStyle = struck > 0.3 ? "#ffffff" : `hsl(${hue},85%,${k < 1 ? 92 : 78}%)`;
        g.lineWidth = 1.2 + struck * 1.2 + (1 - k) * 1.5;
        g.stroke();
      }

      g.restore();

      for (const o of orbs) {
        const k = (t - o.at) / FLIGHT_MS;

        if (k <= 0 || k >= 1) continue;

        const p = { x: o.start.x + (o.hit.x - o.start.x) * k, y: o.start.y + (o.hit.y - o.start.y) * k };

        sprite(g, glow(o.tint), p.x, p.y, 0.9, undefined, 1);
        sprite(g, core, p.x, p.y, 0.35, undefined, 1);
      }

      g.globalAlpha = 1;
    });

    const run = tween(stage, TOTAL_MS, (k, dt) => {
      t = k * TOTAL_MS;

      for (const o of orbs) {
        if (o.done || t < o.at + FLIGHT_MS) continue;

        o.done = true;

        // The spell breaks like foam on a rock: the struck cells flare, the orb crumbles into glittering dust.
        for (const c of grid) if (Math.hypot(target.x + c.x - o.hit.x, target.y + c.y - o.hit.y) < CELL * 3.2) c.hit = t;

        void flash(stage, o.hit, o.tint, 70, 300);

        for (let n = 0; n < 22; n++) emit(stage, o.hit, { tints: [pick(DUST), o.tint], speed: [40, 150], angle: dir > 0 ? [-Math.PI * 0.4, Math.PI * 0.4] : [Math.PI * 0.6, Math.PI * 1.4], life: [0.5, 1], scale: [0.22, 0.04], gravity: 220, drag: 2 });
      }

      if (t < FORM_MS && chance(0.6, dt)) {
        const c = pick(grid);

        if (t > c.born) emit(stage, { x: target.x + c.x, y: target.y + c.y }, { tints: DUST, speed: [5, 20], life: [0.3, 0.5], scale: [0.25, 0.04] });
      }
    }).then(hide);

    await run;
  });
